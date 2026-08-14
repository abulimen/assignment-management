// Mailer transport contract.
//
// Two transports, chosen at call time from the environment:
//   - RESEND_API_KEY set  → Resend HTTP API (POST /emails over fetch, TLS by
//     construction, zero SMTP machinery). Delivery failures are logged loudly
//     but NEVER throw: auth endpoints must keep their no-enumeration 200/201
//     responses even when the provider is down.
//   - no key (dev)        → console + /tmp/mailer.log + in-memory capture so
//     developers can click the link without an email server.
//
// Every sent message is captured in the in-memory list in BOTH transports, so
// the auth-flow tests keep reading raw tokens via sentMails()/lastMail().

import { describe, it, expect, afterEach, vi } from 'vitest';

const { sendMail, sendVerificationEmail, sendPasswordResetEmail, sentMails, clearSentMails } = await import('../src/mailer.js');

const RESEND_URL = 'https://api.resend.com/emails';
const KEY = 're_test_123';

function setEnv(key, value) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  setEnv('RESEND_API_KEY', undefined);
  setEnv('MAIL_FROM', undefined);
  vi.unstubAllGlobals();
  clearSentMails();
});

describe('mailer — dev transport (no RESEND_API_KEY)', () => {
  it('captures the message (to, subject, plain body, url, raw token) without calling fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await sendVerificationEmail({
      to: 'a@test.local',
      name: 'Alice',
      url: 'http://localhost:3000/verify-email?token=rawtok123',
    });

    expect(fetch).not.toHaveBeenCalled();
    const mails = sentMails();
    expect(mails).toHaveLength(1);
    expect(mails[0].to).toBe('a@test.local');
    expect(mails[0].subject).toContain('Verify');
    expect(mails[0].body).toContain('http://localhost:3000/verify-email?token=rawtok123');
    expect(mails[0].token).toBe('rawtok123');
    expect(mails[0].url).toBe('http://localhost:3000/verify-email?token=rawtok123');
  });

  it('captures a password-reset message with its token', async () => {
    await sendPasswordResetEmail({ to: 'b@test.local', name: 'Bob', url: 'http://localhost:3000/reset-password?token=resetraw' });
    const mail = sentMails().at(-1);
    expect(mail.subject).toContain('Reset');
    expect(mail.token).toBe('resetraw');
    expect(mail.body).toContain('reset-password?token=resetraw');
  });
});

describe('mailer — Resend transport (RESEND_API_KEY set)', () => {
  it('POSTs to api.resend.com/emails with bearer auth and the full payload', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    setEnv('RESEND_API_KEY', KEY);
    setEnv('MAIL_FROM', 'Acme <no-reply@acme.com>');

    await sendMail({
      to: 'a@test.local',
      subject: 'Hello',
      text: 'plain body',
      html: '<p>plain body</p>',
      token: 'tok1',
      url: 'http://x/y',
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [args] = fetch.mock.calls[0];
    expect(args).toBe(RESEND_URL);
    const opts = fetch.mock.calls[0][1];
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({
      from: 'Acme <no-reply@acme.com>',
      to: 'a@test.local',
      subject: 'Hello',
      text: 'plain body',
      html: '<p>plain body</p>',
    });
    // In-memory capture still happens so auth tests can read the raw token.
    const mail = sentMails().at(-1);
    expect(mail.token).toBe('tok1');
    expect(mail.url).toBe('http://x/y');
  });

  it('defaults from to Draftly <no-reply@draftly.local> when MAIL_FROM is unset', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    setEnv('RESEND_API_KEY', KEY);

    await sendMail({ to: 'a@test.local', subject: 'S', text: 't' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.from).toBe('Draftly <no-reply@draftly.local>');
  });

  it('logs a delivery failure but still resolves (auth UX must not break)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'domain not verified' }), { status: 400 })));
    setEnv('RESEND_API_KEY', KEY);

    await expect(sendMail({ to: 'a@test.local', subject: 'S', text: 't' })).resolves.toBeUndefined();
    expect(err).toHaveBeenCalledOnce();
    expect(err.mock.calls[0][0]).toContain('RESEND');
    // The message is still captured (token readable by auth tests).
    expect(sentMails()).toHaveLength(1);
    err.mockRestore();
  });

  it('resolves even when the HTTP call throws (provider unreachable)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    setEnv('RESEND_API_KEY', KEY);

    await expect(sendMail({ to: 'a@test.local', subject: 'S', text: 't' })).resolves.toBeUndefined();
    expect(sentMails()).toHaveLength(1);
    err.mockRestore();
  });
});