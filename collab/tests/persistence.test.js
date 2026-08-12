// Persistence: document content survives a full server restart (MySQL-backed).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import {
  getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET,
} from './helpers/testenv.js';

let pool;

beforeAll(async () => {
  pool = await getPool();
});

afterAll(async () => {
  await pool?.end();
});

async function connectMember(server, groupId, userId, text) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token: signJwt({ sub: userId, role: 'student' }, TEST_JWT_SECRET),
  });
  await waitFor(async () => provider.synced);
  if (text != null) {
    const frag = document.getXmlFragment('default');
    frag.insert(frag.length, [new Y.XmlText(text)]);
  }
  return { provider, document };
}

describe('MySQL-backed persistence', () => {
  it('serves persisted content after a full server restart', async () => {
    const seeded = await seedGroup(pool);
    const serverA = await startTestServer();

    const { provider } = await connectMember(serverA, seeded.groupId, seeded.memberIds[0], 'hello realtime');
    // Wait until the server has stored the document state.
    await waitFor(async () => {
      const [rows] = await pool.query(
        'SELECT LENGTH(doc) AS len FROM collab_documents WHERE document_name = ?',
        [`group:${seeded.groupId}`],
      );
      return rows.length > 0 && rows[0].len > 0;
    });
    provider.destroy();
    await serverA.destroy();

    // Fresh server instance, same DB. Content survives inside the sectioned
    // structure (the bare test insert lands loose and gets wrapped by the
    // load-time migration — the text itself must survive untouched).
    const serverB = await startTestServer();
    const { provider: p2, document: d2 } = await connectMember(serverB, seeded.groupId, seeded.memberIds[1], null);
    expect(d2.getXmlFragment('default').toString()).toContain('hello realtime');
    p2.destroy();
    await serverB.destroy();
  }, 60000);
});
