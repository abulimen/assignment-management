// Test harness: builds the test DB once, starts the analyzer + collab stubs,
// and boots createApiServer against assignment_mgmt_test. Mirrors the shape
// of collab/tests/helpers/phpharness.js but spawns the Node API server.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import mysql from 'mysql2/promise';
import { createApiServer } from '../../src/index.js';
import { rateLimiter } from '../../src/rateLimit.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export const TEST_DB = 'assignment_mgmt_test';
export const TEST_JWT_SECRET = 'test-jwt-secret';
export const TEST_INTERNAL_SECRET = 'test-internal-secret';

export function dbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: TEST_DB,
  };
}

export function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

export function buildTestDb() {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [path.join(REPO_ROOT, 'database/build_test_db.sh'), TEST_DB]);
    let err = '';
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build_test_db.sh failed (${code}): ${err}`));
    });
  });
}

async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server.address().port;
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// Analyzer stub: responds with the canned verdict the contract specifies.
export async function startAnalyzerStub() {
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      const parsed = data ? JSON.parse(data) : {};
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        overall_score: 77,
        verdict: 'Likely Original',
        confidence: 'high',
        factors: {},
        risk_flags: [],
        received_events: parsed.events?.length || 0,
        // Echo whether events carried server receive times, so tests can
        // assert the recording-integrity input reaches the analyzer.
        received_at_present: (parsed.events || []).some((e) => e.received_at != null),
      }));
    });
  });
  const port = await listen(server, 0);
  return { port, close: () => new Promise((r) => server.close(r)) };
}

// Collab internal stub: GET state → sha256; POST seal → insert a snapshot row
// into group_doc_snapshots and freeze the group (or report alreadySealed).
const SNAPSHOT_DOC = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'the group essay' }] }],
});
const FAKE_SHA = 'a'.repeat(64);

export async function startCollabStub(pool) {
  const server = http.createServer(async (req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if (req.headers['x-internal-secret'] !== TEST_INTERNAL_SECRET) return send(401, { error: 'unauthorized' });

    const stateMatch = /^\/internal\/doc\/(\d+)\/state$/.exec(req.url || '');
    if (req.method === 'GET' && stateMatch) {
      return send(200, { groupId: Number(stateMatch[1]), sha256: FAKE_SHA });
    }

    const sealMatch = /^\/internal\/doc\/(\d+)\/seal$/.exec(req.url || '');
    if (req.method === 'POST' && sealMatch) {
      const groupId = Number(sealMatch[1]);
      const body = await readJson(req);
      const submissionId = Number(body.submission_id || 0);
      if (!submissionId) return send(400, { error: 'submission_id required' });

      const [[group]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [groupId]);
      if (!group) return send(404, { error: 'Group not found' });
      if (group.frozen_at) return send(200, { sealed: true, alreadySealed: true, sha256: FAKE_SHA });

      await pool.query(
        `INSERT INTO group_doc_snapshots
           (group_id, submission_id, prosemirror_json, html, ydoc_state, content_sha256, contributions, frozen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [groupId, submissionId, SNAPSHOT_DOC, '<p>the group essay</p>', Buffer.from('ydoc'), FAKE_SHA, JSON.stringify({})],
      );
      await pool.query('UPDATE `groups` SET frozen_at = NOW() WHERE id = ? AND frozen_at IS NULL', [groupId]);
      return send(200, { sealed: true, alreadySealed: false, sha256: FAKE_SHA });
    }

    send(404, { error: 'not found' });
  });
  const port = await listen(server, 0);
  return { port, close: () => new Promise((r) => server.close(r)) };
}

export async function startApi(overrides = {}) {
  const cfg = {
    db: dbConfig(),
    jwtSecret: TEST_JWT_SECRET,
    internalSecret: TEST_INTERNAL_SECRET,
    corsOrigin: 'http://localhost:3000',
    analyzerUrl: overrides.analyzerUrl || `http://127.0.0.1:${overrides.analyzerPort || 0}`,
    collabUrl: `http://127.0.0.1:${overrides.collabPort || 0}`,
    ...overrides.config,
  };
  const handle = await createApiServer({ port: overrides.port || 0, config: cfg, staticDir: overrides.staticDir });
  return handle;
}

export async function apiCall(api, path, { method = 'GET', token, body, cookies, origin, headers: extraHeaders } = {}) {
  const res = await fetch(`http://127.0.0.1:${api.port}/api/${path}`, {
    method,
    headers: {
      // CSRF: cookie-authenticated requests must carry an allowed Origin.
      Origin: origin || 'http://localhost:3000',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookies ? { Cookie: cookies } : {}),
      ...(extraHeaders || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON (204 logout etc.) */ }
  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [];
  return { status: res.status, json, cookies: setCookies, headers: res.headers };
}

// Cookie helpers (node fetch exposes Set-Cookie via headers.getSetCookie()).
// firstCookiePair extracts the `name=value` part for replaying in requests.
export function firstCookiePair(setCookies) {
  if (!Array.isArray(setCookies) || !setCookies.length) return '';
  return setCookies[0].split(';')[0].trim();
}

// Returns the value of a cookie attribute (HttpOnly, SameSite, ...) or null.
export function cookieAttribute(setCookies, attr) {
  for (const sc of setCookies || []) {
    for (const part of sc.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k.toLowerCase() === attr.toLowerCase()) {
        return rest.join('=') || true;
      }
    }
  }
  return null;
}

let emailSeq = 0;
// Register an account and return a usable access token for it.
// The new contract does NOT auto-login, so the helper verifies the email
// (direct DB flag — the real verify endpoint is covered by auth.test.js) and
// logs in. Rate limits are reset before each call so bulk test registrations
// never trip the register/IP limit.
export async function registerUser(api, { name, role = 'student' } = {}) {
  rateLimiter.reset();
  emailSeq += 1;
  const email = `it_${Date.now()}_${emailSeq}_${Math.floor(Math.random() * 1e6)}@test.local`;
  const { status, json } = await apiCall(api, 'register', {
    method: 'POST',
    body: { email, password: 'password123', name, role },
  });
  if (status !== 201) throw new Error(`register failed: ${status} ${JSON.stringify(json)}`);
  await api.pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [json.user.id]);
  const loginRes = await apiCall(api, 'login', { method: 'POST', body: { email, password: 'password123' } });
  if (loginRes.status !== 200) {
    throw new Error(`helper login failed: ${loginRes.status} ${JSON.stringify(loginRes.json)}`);
  }
  const [courses] = await api.pool.query('SELECT id FROM courses');
  if (role === 'student' && courses.length > 0) {
    for (const c of courses) {
      await api.pool.query('INSERT IGNORE INTO course_members (course_id, user_id, role) VALUES (?, ?, ?)', [c.id, json.user.id, 'student']);
    }
  }
  return { token: loginRes.json.accessToken, user: loginRes.json.user };
}

// Cached singleton: build DB once, start stubs + main API once.
let harness = null;
export async function getHarness() {
  if (harness) return harness;
  await buildTestDb();
  const pool = mysql.createPool({ ...dbConfig(), waitForConnections: true, connectionLimit: 10 });
  const analyzer = await startAnalyzerStub();
  const collab = await startCollabStub(pool);
  const api = await startApi({ analyzerPort: analyzer.port, collabPort: collab.port });
  harness = {
    pool,
    api,
    analyzerPort: analyzer.port,
    collabPort: collab.port,
    close: async () => {
      await api.close();
      await analyzer.close();
      await collab.close();
      await pool.end();
      harness = null;
    },
  };
  return harness;
}