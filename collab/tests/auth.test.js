// Membership auth: only group members may open the group's realtime document,
// using the same HS256 JWTs PHP mints. Frozen documents open read-only.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import {
  getPool, seedGroup, startTestServer, TEST_JWT_SECRET, waitFor,
} from './helpers/testenv.js';

let pool;
let server;

beforeAll(async () => {
  pool = await getPool();
  server = await startTestServer();
});

afterAll(async () => {
  await server?.destroy();
  await pool?.end();
});

const tokenFor = (sub, role = 'student') => signJwt({ sub, role }, TEST_JWT_SECRET);

function connect({ name, token, timeout = 8000 }) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name,
    document,
    token,
  });
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ outcome: 'timeout', provider, document });
    }, timeout);
    provider.on('authenticated', () => {
      clearTimeout(timer);
      resolve({ outcome: 'authenticated', provider, document });
    });
    provider.on('authenticationFailed', () => {
      clearTimeout(timer);
      resolve({ outcome: 'rejected', provider, document });
    });
    provider.on('synced', () => {
      clearTimeout(timer);
      resolve({ outcome: 'synced', provider, document });
    });
  });
}

describe('collab server authentication', () => {
  it('accepts a group member with a valid JWT', async () => {
    const seeded = await seedGroup(pool);
    const { outcome, provider } = await connect({
      name: `group:${seeded.groupId}`,
      token: tokenFor(seeded.memberIds[1]),
    });
    expect(['authenticated', 'synced']).toContain(outcome);
    provider.destroy();
  });

  it('rejects a student who is not a member of the group', async () => {
    const seeded = await seedGroup(pool);
    const { outcome, provider } = await connect({
      name: `group:${seeded.groupId}`,
      token: tokenFor(seeded.outsiderId),
    });
    expect(outcome).toBe('rejected');
    provider.destroy();
  });

  it('rejects an invalid JWT', async () => {
    const seeded = await seedGroup(pool);
    const { outcome, provider } = await connect({
      name: `group:${seeded.groupId}`,
      token: 'garbage.token.here',
    });
    expect(outcome).toBe('rejected');
    provider.destroy();
  });

  it('rejects a lecturer for an in-progress group (no live watch in MVP)', async () => {
    const seeded = await seedGroup(pool);
    const { outcome, provider } = await connect({
      name: `group:${seeded.groupId}`,
      token: tokenFor(seeded.lecturerId, 'lecturer'),
    });
    expect(outcome).toBe('rejected');
    provider.destroy();
  });

  it('rejects malformed document names', async () => {
    const { outcome, provider } = await connect({
      name: 'hack; DROP TABLE users',
      token: tokenFor(1),
    });
    expect(outcome).toBe('rejected');
    provider.destroy();
  });

  it('rejects a member of a DIFFERENT group', async () => {
    const a = await seedGroup(pool);
    const b = await seedGroup(pool);
    const { outcome, provider } = await connect({
      name: `group:${a.groupId}`,
      token: tokenFor(b.memberIds[0]),
    });
    expect(outcome).toBe('rejected');
    provider.destroy();
  });

  it('opens frozen (submitted) documents read-only for members', async () => {
    const seeded = await seedGroup(pool, { frozen: true });
    const { outcome, provider, document } = await connect({
      name: `group:${seeded.groupId}`,
      token: tokenFor(seeded.memberIds[0]),
    });
    expect(['authenticated', 'synced']).toContain(outcome);
    // Wait for sync, then attempt a write — it must not reach the doc.
    await waitFor(async () => provider.synced);
    const frag = document.getXmlFragment('default');
    const before = frag.toString();
    frag.insert(frag.length, [new Y.XmlText('should not stick')]);
    await new Promise((r) => setTimeout(r, 500));
    // Read-only connections never broadcast their changes; local doc may show
    // the edit, but the SERVER copy must not change. Verify via a second client.
    const { provider: p2, document: d2 } = await connect({
      name: `group:${seeded.groupId}`,
      token: tokenFor(seeded.memberIds[1]),
    });
    await waitFor(async () => p2.synced);
    expect(d2.getXmlFragment('default').toString()).toBe(before);
    provider.destroy();
    p2.destroy();
  });
});
