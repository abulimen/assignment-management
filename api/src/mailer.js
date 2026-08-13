// Mailer abstraction for auth emails (verification + password reset).
//
// Default transport (local dev): logs the message to the server console and
// APPENDS the full verification/reset URL to /tmp/mailer.log so developers can
// click it without running an email server.
//
// SMTP transport: enabled when MAIL_HOST (+ MAIL_PORT) is set, with
// MAIL_USER / MAIL_PASS / MAIL_FROM. A small dependency-free SMTP client is
// used (was avoided pulling nodemailer into the api service).
//
// Every sent message is also captured in an in-memory list so tests can read
// the raw token (clearSentMails / sentMails).

import fs from 'node:fs';
import net from 'node:net';

const MAIL_LOG = process.env.MAIL_LOG || '/tmp/mailer.log';
const sent = [];

function appendLog(line) {
  try {
    fs.appendFileSync(MAIL_LOG, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    // Logging must never fail the request.
    // eslint-disable-next-line no-console
    console.error('[mailer] cannot append to', MAIL_LOG, e.message);
  }
}

// --- SMTP client (raw, minimal) -------------------------------------------
function smtpSend({ from, to, subject, text }) {
  return new Promise((resolve, reject) => {
    const host = process.env.MAIL_HOST;
    const port = Number(process.env.MAIL_PORT || 25);
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;
    const sock = net.connect(port, host);
    let buffer = '';
    let step = 0;

    const sendLine = (line) => sock.write(`${line}\r\n`);

    const data = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      text,
      '.',
    ].join('\r\n');

    const fail = (err) => { sock.destroy(); reject(err); };

    sock.setTimeout(15000, () => fail(new Error('SMTP timeout')));

    sock.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      if (lines.length < 2 || !lines[lines.length - 2]) return; // incomplete reply
      const reply = lines[lines.length - 2];
      buffer = lines[lines.length - 1] || '';
      const code = Number(reply.slice(0, 3));
      if (step !== 4 && code >= 400) return fail(new Error(`SMTP ${code}: ${reply}`));

      if (step === 0) { // EHLO
        step = 1;
        sendLine(`EHLO ${host || 'localhost'}`);
      } else if (step === 1) { // AUTH or skip
        if (user && pass) {
          step = 2;
          sendLine('AUTH LOGIN');
        } else {
          step = 3;
          sendLine(`MAIL FROM:<${from}>`);
        }
      } else if (step === 2) { // AUTH credentials
        step = 3;
        // rfc: first USER then PASS (server replies 334 to each)
        // The AUTH LOGIN flow: 334 VXNlcm5hbWU6 -> user, 334 UGFzc3dvcmQ6 -> pass
        const authStep = reply.includes('UGFzc3dvcmQ6') ? 'pass' : 'user';
        sendLine(authStep === 'user'
          ? Buffer.from(user).toString('base64')
          : Buffer.from(pass).toString('base64'));
        if (authStep === 'pass') { step = 3; sendLine(`MAIL FROM:<${from}>`); }
      } else if (step === 3) {
        step = 4;
        sendLine(`RCPT TO:<${to}>`);
      } else if (step === 4) {
        step = 5;
        sendLine('DATA');
      } else if (step === 5) {
        step = 6;
        sendLine(data);
      } else if (step === 6) {
        sock.write('QUIT\r\n');
        sock.destroy();
        resolve();
      }
    });
    sock.on('error', reject);
  });
}

export function sendMail({ to, subject, text, html, token, url }) {
  sent.push({ to, subject, text, body: text, html, url, token, at: new Date().toISOString() });

  const line = `to=${to} subject=${JSON.stringify(subject)} body=${JSON.stringify(text || html)}`;
  // eslint-disable-next-line no-console
  console.log(`[mailer] ${line}`);
  appendLog(line);

  if (process.env.MAIL_HOST) {
    const from = process.env.MAIL_FROM || 'no-reply@assignment-mgmt.local';
    return smtpSend({ from, to, subject, text: text || '' }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[mailer] SMTP delivery failed:', err.message);
    });
  }
  return Promise.resolve();
}

// Convenience wrappers used by routes. url carries the raw one-time token;
// the raw token is captured too so tests can replay the real flow.
export function sendVerificationEmail({ to, name, url }) {
  const match = /token=([^&\s]+)/.exec(url);
  const token = match ? match[1] : null;
  return sendMail({
    to,
    subject: 'Verify your Assignment Manager email',
    text: `Hi ${name || 'there'},\n\nPlease verify your email address to finish creating your account:\n\n${url}\n\nThis link expires in 24 hours.\n\n— Assignment Manager`,
    html: `<p>Hi ${name || 'there'},</p><p>Please verify your email address:</p><p><a href="${url}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
    token,
    url,
  });
}

export function sendPasswordResetEmail({ to, name, url }) {
  const match = /token=([^&\s]+)/.exec(url);
  const token = match ? match[1] : null;
  return sendMail({
    to,
    subject: 'Reset your Assignment Manager password',
    text: `Hi ${name || 'there'},\n\nA password reset was requested for your account. If that wasn't you, you can safely ignore this email.\n\n${url}\n\nThis link expires in 1 hour.\n\n— Assignment Manager`,
    html: `<p>Hi ${name || 'there'},</p><p>Reset your password:</p><p><a href="${url}">Reset my password</a></p><p>This link expires in 1 hour.</p>`,
    token,
    url,
  });
}

// Test seam: read / clear the captured messages.
export function sentMails() { return sent; }
export function clearSentMails() { sent.length = 0; }
export function lastMail() { return sent[sent.length - 1]; }