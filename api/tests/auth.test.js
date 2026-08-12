import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '@am/core';
import { getHarness, apiCall, TEST_JWT_SECRET } from './helpers/harness.js';

let h;

beforeAll(async () => { h = await getHarness(); });
afterAll(async () => { await h.close(); });

describe('POST /api/register', () => {
  it('registers a user, returns a verifiable JWT, and bcrypt-hashes the password', async () => {
    const email = `reg_${Date.now()}@test.local`;
    const { status, json } = await apiCall(h.api, 'register', {
      method: 'POST',
      body: { email, password: 'password123', name: 'Alice', role: 'student' },
    });
    expect(status).toBe(201);
    expect(json.user.email).toBe(email);
    expect(json.user.name).toBe('Alice');
    expect(json.user.role).toBe('student');
    expect(typeof json.token).toBe('string');

    const payload = verifyJwt(json.token, TEST_JWT_SECRET);
    expect(payload).toBeTruthy();
    expect(payload.sub).toBe(json.user.id);
    expect(payload.role).toBe('student');

    const [[row]] = await h.pool.query('SELECT password FROM users WHERE id = ?', [json.user.id]);
    expect(row.password).not.toBe('password123');
    expect(bcrypt.compareSync('password123', row.password)).toBe(true);
  });

  it('rejects duplicate email with 409', async () => {
    const email = `dup_${Date.now()}@test.local`;
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: 'password123', name: 'A', role: 'student' } });
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email, password: 'otherpass1', name: 'B', role: 'student' } });
    expect(status).toBe(409);
    expect(json.error).toBe('Email already registered');
  });

  it('rejects missing fields with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 'x@test.local', password: 'password123' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Missing required field: name');
  });

  it('rejects invalid email with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 'not-an-email', password: 'password123', name: 'A', role: 'student' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Invalid email address');
  });

  it('rejects invalid role with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 'r@test.local', password: 'password123', name: 'A', role: 'admin' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Role must be lecturer or student');
  });

  it('rejects short password with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 's@test.local', password: 'short', name: 'A', role: 'student' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Password must be at least 8 characters');
  });
});

describe('POST /api/login', () => {
  it('logs in with correct credentials', async () => {
    const email = `login_${Date.now()}@test.local`;
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: 'password123', name: 'Bob', role: 'lecturer' } });
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: 'password123' } });
    expect(status).toBe(200);
    expect(json.user.email).toBe(email);
    expect(json.user.role).toBe('lecturer');
    const payload = verifyJwt(json.token, TEST_JWT_SECRET);
    expect(payload.sub).toBe(json.user.id);
  });

  it('rejects wrong password with 401', async () => {
    const email = `wrong_${Date.now()}@test.local`;
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: 'password123', name: 'C', role: 'student' } });
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: 'wrongpass1' } });
    expect(status).toBe(401);
    expect(json.error).toBe('Invalid email or password');
  });

  it('rejects unknown email with 401', async () => {
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email: 'nobody@test.local', password: 'password123' } });
    expect(status).toBe(401);
    expect(json.error).toBe('Invalid email or password');
  });
});