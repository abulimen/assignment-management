// JWT parity: the Node collab server must verify tokens minted by PHP's
// src/jwt.php (manual HS256), and reject everything PHP would reject.
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyJwt } from '../src/jwt.js';

const pexecFile = promisify(execFile);
const PHP_JWT = fileURLToPath(new URL('../../src/jwt.php', import.meta.url));
const SECRET = 'parity-test-secret';

// Mint a real token with the production PHP implementation.
async function phpMint(payloadObj, secret = SECRET) {
  const json = JSON.stringify(payloadObj).replace(/'/g, "\\'");
  const code = `require '${PHP_JWT}'; echo jwt_encode(json_decode('${json}', true));`;
  const { stdout } = await pexecFile('php', ['-r', code], {
    env: { ...process.env, JWT_SECRET: secret },
  });
  return stdout.trim();
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

describe('verifyJwt — parity with src/jwt.php', () => {
  it('accepts a token minted by PHP and returns the payload', async () => {
    const token = await phpMint({ sub: 42, role: 'student' });
    const payload = verifyJwt(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload.sub).toBe(42);
    expect(payload.role).toBe('student');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });

  it('accepts a lecturer token', async () => {
    const token = await phpMint({ sub: 7, role: 'lecturer' });
    const payload = verifyJwt(token, SECRET);
    expect(payload?.role).toBe('lecturer');
    expect(payload?.sub).toBe(7);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await phpMint({ sub: 1, role: 'student' }, 'some-other-secret');
    expect(verifyJwt(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await phpMint({ sub: 1, role: 'student' });
    const [h, p, s] = token.split('.');
    const forged = [h, b64url({ sub: 999, role: 'lecturer', exp: 9999999999 }), s].join('.');
    expect(verifyJwt(forged, SECRET)).toBeNull();
  });

  it('rejects a tampered signature', async () => {
    const token = await phpMint({ sub: 1, role: 'student' });
    const flipped = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    expect(verifyJwt(flipped, SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await phpMint({ sub: 1, role: 'student', exp: 1000 });
    expect(verifyJwt(token, SECRET)).toBeNull();
  });

  it('rejects alg:none tokens', () => {
    const none = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ sub: 1, role: 'student', exp: 9999999999 })}.`;
    expect(verifyJwt(none, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyJwt('', SECRET)).toBeNull();
    expect(verifyJwt('abc', SECRET)).toBeNull();
    expect(verifyJwt('a.b.c.d', SECRET)).toBeNull();
    expect(verifyJwt('a.b.!!!not-base64url!!!', SECRET)).toBeNull();
  });

  it('rejects a payload without exp', () => {
    const h = b64url({ alg: 'HS256', typ: 'JWT' });
    const p = b64url({ sub: 1, role: 'student' });
    const sig = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
    expect(verifyJwt(`${h}.${p}.${sig}`, SECRET)).toBeNull();
  });
});
