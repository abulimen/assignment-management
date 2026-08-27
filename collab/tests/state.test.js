// Internal doc-state endpoint: PHP asks Node for the canonical content hash
// (used when a member marks Done). Clients never supply hashes.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import {
  getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET, TEST_INTERNAL_SECRET,
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

async function state(groupId, secret = TEST_INTERNAL_SECRET) {
  const res = await fetch(`http://127.0.0.1:${server.internalPort}/internal/doc/${groupId}/state`, {
    headers: { 'X-Internal-Secret': secret },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function typeViaProvider(groupId, userId, text) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token: signJwt({ sub: userId, role: 'student' }, TEST_JWT_SECRET),
  });
  await waitFor(async () => provider.synced);
  const frag = document.getXmlFragment('default');
  frag.insert(frag.length, [new Y.XmlText(text)]);
  await new Promise((r) => setTimeout(r, 300));
  provider.destroy();
  await new Promise((r) => setTimeout(r, 200));
}

describe('GET /internal/doc/:groupId/state', () => {
  it('rejects a missing or wrong internal secret', async () => {
    const seeded = await seedGroup(pool);
    const noHeader = await fetch(`http://127.0.0.1:${server.internalPort}/internal/doc/${seeded.groupId}/state`);
    expect(noHeader.status).toBe(401);
    const wrong = await state(seeded.groupId, 'wrong-secret');
    expect(wrong.status).toBe(401);
  });

  it('returns 404 for a non-existent group', async () => {
    const res = await state(999999);
    expect(res.status).toBe(404);
  });

  it('returns a deterministic sha256 for the same content', async () => {
    const seeded = await seedGroup(pool);
    const a = await state(seeded.groupId);
    const b = await state(seeded.groupId);
    expect(a.status).toBe(200);
    expect(a.json.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(b.json.sha256).toBe(a.json.sha256);
  });

  it('hash changes when the content changes', async () => {
    const seeded = await seedGroup(pool);
    const before = await state(seeded.groupId);
    await typeViaProvider(seeded.groupId, seeded.memberIds[0], 'new content');
    const after = await state(seeded.groupId);
    expect(after.json.sha256).not.toBe(before.json.sha256);
  });

  it('still works after all clients disconnect (doc loaded from MySQL)', async () => {
    const seeded = await seedGroup(pool);
    await typeViaProvider(seeded.groupId, seeded.memberIds[0], 'persisted words');
    // No providers connected now — state must load from collab_documents.
    const a = await state(seeded.groupId);
    const b = await state(seeded.groupId);
    expect(a.status).toBe(200);
    expect(a.json.sha256).toBe(b.json.sha256);
  });
});
