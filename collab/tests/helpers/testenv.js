// Test harness: test DB access, seeding, and collab server lifecycle.
import mysql from 'mysql2/promise';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createCollabServer } from '../../src/server.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export const TEST_DB = process.env.COLLAB_TEST_DB || 'assignment_mgmt_test';
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

let dbBootstrapped = false;
export async function buildTestDb() {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [path.join(REPO_ROOT, 'database/build_test_db.sh'), TEST_DB], {
      env: { ...process.env, COLLAB_TEST_DB: TEST_DB },
    });
    let err = '';
    child.stderr.on('data', (c) => { err += c; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build_test_db.sh failed (${code}): ${err}`));
    });
  });
}

export async function ensureTestDb() {
  if (dbBootstrapped) return;
  await buildTestDb();
  dbBootstrapped = true;
}

export async function getPool() {
  await ensureTestDb();
  return mysql.createPool({ ...dbConfig(), waitForConnections: true, connectionLimit: 5 });
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

// Seed a lecturer, a group assignment, a group with memberCount students,
// and one outsider. Returns ids and JWTs are minted by the caller via Node jwt helper.
export async function seedGroup(pool, { memberCount = 2, frozen = false } = {}) {
  await ensureTestDb();
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = (n) => `u${ts}_${n}@test.local`;

  const insUser = async (name, role) => {
    const [r] = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
      [email(name), 'not-a-real-hash', name, role],
    );
    return r.insertId;
  };

  const lecturerId = await insUser('lecturer', 'lecturer');
  const memberIds = [];
  for (let i = 0; i < memberCount; i++) memberIds.push(await insUser(`member${i}`, 'student'));
  const outsiderId = await insUser('outsider', 'student');

  const [a] = await pool.query(
    'INSERT INTO assignments (lecturer_id, title, is_group_work) VALUES (?, ?, 1)',
    [lecturerId, 'Realtime Test Assignment'],
  );
  const assignmentId = a.insertId;

  const [g] = await pool.query(
    'INSERT INTO `groups` (assignment_id, leader_id, invite_code, frozen_at) VALUES (?, ?, ?, ?)',
    [assignmentId, memberIds[0], `T${ts}`.slice(0, 32), frozen ? new Date() : null],
  );
  const groupId = g.insertId;

  for (const mid of memberIds) {
    await pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [groupId, mid]);
    await pool.query(
      "INSERT INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'not_started')",
      [groupId, mid],
    );
  }

  return { lecturerId, memberIds, leaderId: memberIds[0], outsiderId, assignmentId, groupId };
}

// Start a collab server on free ports against the test DB.
export async function startTestServer() {
  const wsPort = await getFreePort();
  const internalPort = await getFreePort();
  const handle = await createCollabServer({
    wsPort,
    internalPort,
    db: dbConfig(),
    jwtSecret: TEST_JWT_SECRET,
    internalSecret: TEST_INTERNAL_SECRET,
  });
  return { ...handle, wsPort: handle.wsPort || wsPort, internalPort: handle.internalPort || internalPort };
}

export function waitFor(fn, { timeout = 10000, interval = 50 } = {}) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = async () => {
      try {
        const v = await fn();
        if (v) return resolve(v);
      } catch { /* retry */ }
      if (Date.now() - start > timeout) return reject(new Error('waitFor timeout'));
      setTimeout(tick, interval);
    };
    tick();
  });
}
