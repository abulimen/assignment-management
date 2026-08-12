// Integration harness: boots the real PHP API (php -S) against the test DB,
// wired to a running collab server via the internal API. Users get REAL JWTs
// through register.php — the full production auth path.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export async function startPhpApi({ port, dbName, collabInternalUrl, internalSecret, jwtSecret }) {
  const child = spawn(
    'php',
    ['-d', 'display_errors=1', '-S', `127.0.0.1:${port}`, '-t', 'public', 'public/router.php'],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        DB_HOST: '127.0.0.1',
        DB_PORT: '3306',
        DB_USER: 'root',
        DB_PASS: '',
        DB_NAME: dbName,
        JWT_SECRET: jwtSecret,
        COLLAB_INTERNAL_URL: collabInternalUrl,
        INTERNAL_API_SECRET: internalSecret,
        CORS_ORIGIN: 'http://localhost:3000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stderr.on('data', () => {}); // php notices are noise
  child.stdout.on('data', () => {});

  // Wait until the router answers (an invalid login returns a JSON error fast).
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/login.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.status < 500) break;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) {
      child.kill('SIGTERM');
      throw new Error('PHP dev server did not start');
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return {
    port,
    base: `http://127.0.0.1:${port}/api`,
    kill: () => child.kill('SIGTERM'),
  };
}

export async function apiCall(php, path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${php.base}/${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

let emailSeq = 0;
export async function registerUser(php, { name, role = 'student' }) {
  emailSeq += 1;
  const email = `it_${Date.now()}_${emailSeq}_${Math.floor(Math.random() * 1e6)}@test.local`;
  const { status, json } = await apiCall(php, 'register.php', {
    method: 'POST',
    body: { email, password: 'password123', name, role },
  });
  if (status !== 201) throw new Error(`register failed: ${status} ${JSON.stringify(json)}`);
  return { token: json.token, user: json.user };
}
