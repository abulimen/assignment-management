// Mailer abstraction for auth emails (verification + password reset).
//
// Two transports, chosen at call time from the environment:
//   - RESEND_API_KEY set  → Resend HTTP API (POST /v0/emails over fetch).
//     TLS is the provider's job, so this is a dependency-free one-request
//     transport. Requires a verified sender domain on the Resend side.
//   - no key (dev)        → logs the message to the server console and
//     APPENDS the full verification/reset URL to /tmp/mailer.log so developers
//     can click it without running an email server.
//
// Delivery failure NEVER throws: auth endpoints must keep their no-enumeration
// 200/201 responses even when the provider is down, but the failure is logged
// loudly (RESEND FAILED) so an operator can spot silent mail loss.
//
// Every sent message is also captured in an in-memory list so tests can read
// the raw token (clearSentMails / sentMails / lastMail).

import fs from 'node:fs';

const MAIL_LOG = process.env.MAIL_LOG || '/tmp/mailer.log';
const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Draftly <no-reply@draftly.local>';
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

// --- Resend transport (HTTP API) ------------------------------------------
async function resendSend({ from, to, subject, text, html }) {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore body read failure */ }
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

export function sendMail({ to, subject, text, html, token, url }) {
  sent.push({ to, subject, text, body: text, html, url, token, at: new Date().toISOString() });

  const line = `to=${to} subject=${JSON.stringify(subject)} body=${JSON.stringify(text || html)}`;
  // eslint-disable-next-line no-console
  console.log(`[mailer] ${line}`);
  appendLog(line);

  if (process.env.RESEND_API_KEY) {
    const from = process.env.MAIL_FROM || DEFAULT_FROM;
    return resendSend({ from, to, subject, text: text || '', html })
      .catch((err) => {
        // Red-flag, never throw — auth endpoints answer generically regardless.
        // eslint-disable-next-line no-console
        console.error(`[mailer] RESEND DELIVERY FAILED (to=${to}, subject=${subject}): ${err.message}`);
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
    subject: 'Verify your Draftly email',
    text: `Hi ${name || 'there'},\n\nPlease verify your email address to finish creating your account:\n\n${url}\n\nThis link expires in 24 hours.\n\n— Draftly`,
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
    subject: 'Reset your Draftly password',
    text: `Hi ${name || 'there'},\n\nA password reset was requested for your account. If that wasn't you, you can safely ignore this email.\n\n${url}\n\nThis link expires in 1 hour.\n\n— Draftly`,
    html: `<p>Hi ${name || 'there'},</p><p>Reset your password:</p><p><a href="${url}">Reset my password</a></p><p>This link expires in 1 hour.</p>`,
    token,
    url,
  });
}

// Test seam: read / clear the captured messages.
export function sentMails() { return sent; }
export function clearSentMails() { sent.length = 0; }
export function lastMail() { return sent[sent.length - 1]; }