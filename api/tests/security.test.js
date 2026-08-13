import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { verifyJwt } from '@am/core';
import {
  getHarness, apiCall, registerUser, firstCookiePair,
  TEST_JWT_SECRET,
} from './helpers/harness.js';
import { rateLimiter } from '../src/rateLimit.js';

let h;
let emailSeq = 0;
const uni = (p) => `${p}_${Date.now()}_${++emailSeq}@test.local`;
const PASSWORD = 'password123';

beforeAll(async () => { h = await getHarness(); });
afterAll(async () => { await h.close(); });
beforeEach(() => rateLimiter.reset());

async function verifiedLogin() {
  const email = uni('sec');
  await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'Sec', role: 'student' } });
  await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
  const res = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
  return { jar: firstCookiePair(res.cookies), email };
}

describe('security headers on every response', () => {
  const REQUIRED = [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['referrer-policy', 'strict-origin-when-cross-origin'],
    ['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
    ['content-security-policy', null], // value asserted separately
  ];

  function expectHeaders(headers) {
    for (const [name, value] of REQUIRED) {
      const got = headers.get(name);
      expect(got, `missing ${name}`).toBeTruthy();
      if (value !== null) expect(got).toContain(value);
    }
  }

  it('sets headers on the SPA shell response', async () => {
    const res = await fetch(`http://127.0.0.1:${h.api.port}/`);
    expect(res.status).toBe(200);
    expectHeaders(res.headers);
  });

  it('sets headers on asset responses', async () => {
    // A small static file served from the repo public dir (index.html is the shell).
    const res = await fetch(`http://127.0.0.1:${h.api.port}/assets/index.html`);
    expect(res.status).toBe(200);
    expectHeaders(res.headers);
  });

  it('sets headers on API JSON responses', async () => {
    const { headers } = await apiCall(h.api, 'assignments');
    expectHeaders(headers);
  });

  it('sends a CSP the built SPA can run under', async () => {
    const res = await fetch(`http://127.0.0.1:${h.api.port}/`);
    const csp = res.headers.get('content-security-policy').split(';').map((s) => s.trim());
    const directive = (name) => csp.find((d) => d.startsWith(`${name} `));
    expect(directive("default-src")).toContain("'self'");
    expect(directive('script-src')).toContain("'self'");
    expect(directive('style-src')).toContain("'unsafe-inline'"); // TipTap/Recharts style attrs
    expect(directive('style-src')).toContain('https://fonts.googleapis.com');
    expect(directive('font-src')).toContain('https://fonts.gstatic.com');
    expect(directive('img-src')).toContain('blob:'); // TipTap images
    expect(directive('connect-src')).toContain('ws:'); // Yjs collab + tracking WS
    expect(directive('connect-src')).toContain('wss:');
    expect(directive('frame-ancestors')).toContain("'none'");
    expect(directive('base-uri')).toContain("'self'");
    expect(directive('form-action')).toContain("'self'");
  });
});

describe('CSRF: cookie-authenticated state changes require a matching Origin', () => {
  it('allows a cookie POST with the dev Origin', async () => {
    const { jar } = await verifiedLogin();
    const res = await apiCall(h.api, 'logout', { method: 'POST', cookies: jar });
    expect(res.status).toBe(204);
  });

  it('rejects a cookie POST with NO Origin header (403)', async () => {
    const { jar } = await verifiedLogin();
    const res = await apiCall(h.api, 'logout', {
      method: 'POST', cookies: jar,
      headers: { Origin: '' }, // strip the default harness Origin
    });
    // Origin present-but-empty still fails; we also test the absent case below.
    expect(res.status).toBe(403);
    expect(res.json.error).toBe('Forbidden');
  });

  it('rejects a cookie POST from a foreign Origin (403)', async () => {
    const { jar } = await verifiedLogin();
    const res = await apiCall(h.api, 'logout', {
      method: 'POST', cookies: jar, origin: 'https://evil.example',
    });
    expect(res.status).toBe(403);
  });

  it('rejects a cookie POST with a missing Origin header sent at the socket level', async () => {
    // Node's fetch always lets us omit Origin: build the request manually.
    const { jar } = await verifiedLogin();
    const raw = await fetch(`http://127.0.0.1:${h.api.port}/api/refresh`, {
      method: 'POST',
      headers: { Cookie: jar, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(raw.status).toBe(403);
  });

  it('still allows the cookie flow when Origin is allowed', async () => {
    const { jar } = await verifiedLogin();
    const res = await apiCall(h.api, 'refresh', { method: 'POST', cookies: jar });
    expect(res.status).toBe(200);
    expect(res.json.accessToken).toBeTruthy();
    expect(verifyJwt(res.json.accessToken, TEST_JWT_SECRET)).toBeTruthy();
  });

  it('skips the check for Bearer-only requests (no cookie → no CSRF risk)', async () => {
    const { token } = await registerUser(h.api, { name: 'Bearer Only', role: 'lecturer' });
    const res = await apiCall(h.api, 'assignments', {
      method: 'POST', token, body: { title: 'NoCookieCsrf' },
      headers: { Origin: '' },
    });
    // Without a cookie the check does not run even with no Origin header.
    expect(res.status).toBe(201);
  });
});