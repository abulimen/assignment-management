// Headless export fidelity: the Node server must render the shared Y.Doc into
// the SAME ProseMirror JSON TipTap produces, count surviving characters per
// author (deleted text doesn't count), and generate review-ready HTML.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { docToProseMirrorJSON, docToHTML, survivingCharsByAuthor } from '../src/export.js';
import { signJwt } from '../src/jwt.js';
import { getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET } from './helpers/testenv.js';

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

// Connect and build content INSIDE the seeded first section (the server
// seeds every new document with one empty section), the way TipTap edits it.
async function withDoc(groupId, userId, build) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token: signJwt({ sub: userId, role: 'student' }, TEST_JWT_SECRET),
  });
  await waitFor(async () => provider.synced);
  const frag = document.getXmlFragment('default');
  await waitFor(async () => frag.length > 0);
  const section = frag.get(0);
  build(section, Y);
  await new Promise((r) => setTimeout(r, 300));
  const json = docToProseMirrorJSON(document);
  provider.destroy();
  return { json, document };
}

function paragraphWith(text, authorId) {
  const p = new Y.XmlElement('paragraph');
  const t = new Y.XmlText(text);
  t.format(0, text.length, { author: { authorId } });
  p.insert(0, [t]);
  return p;
}

describe('headless export', () => {
  it('round-trips paragraphs, text, and author marks to ProseMirror JSON', async () => {
    const seeded = await seedGroup(pool);
    const { json } = await withDoc(seeded.groupId, seeded.memberIds[0], (section) => {
      section.insert(section.length, [paragraphWith('hello world', 11)]);
    });

    expect(json.type).toBe('doc');
    expect(json.content).toHaveLength(1);
    const sectionNode = json.content[0];
    expect(sectionNode.type).toBe('section');
    // Our paragraph lands after the seeded title + seed paragraph.
    const para = sectionNode.content[sectionNode.content.length - 1];
    expect(para.type).toBe('paragraph');
    const text = para.content[0];
    expect(text.text).toBe('hello world');
    const author = (text.marks || []).find((m) => m.type === 'author');
    expect(author.attrs.authorId).toBe(11);
  });

  it('counts surviving characters per author', async () => {
    const seeded = await seedGroup(pool);
    const [m0, m1] = seeded.memberIds;
    const { json } = await withDoc(seeded.groupId, m0, (section) => {
      section.insert(section.length, [paragraphWith('aaaa', m0)]);
      section.insert(section.length, [paragraphWith('bbbbbb', m1)]);
    });

    const counts = survivingCharsByAuthor(json);
    expect(counts[m0]).toBe(4);
    expect(counts[m1]).toBe(6);
  });

  it('deleted text does NOT count toward surviving chars', async () => {
    const seeded = await seedGroup(pool);
    const [m0] = seeded.memberIds;
    const { json } = await withDoc(seeded.groupId, m0, (section) => {
      section.insert(section.length, [paragraphWith('keep', m0)]);
      const p2 = paragraphWith('vanish', m0);
      section.insert(section.length, [p2]);
      // Delete 'vanish' from the text node — tombstoned text must score zero.
      p2.get(0).delete(0, 'vanish'.length);
    });

    const counts = survivingCharsByAuthor(json);
    expect(counts[m0]).toBe(4); // only 'keep'
  });

  it('generates HTML with author attribution spans', async () => {
    const seeded = await seedGroup(pool);
    const { json } = await withDoc(seeded.groupId, seeded.memberIds[0], (section) => {
      section.insert(section.length, [paragraphWith('render me', 77)]);
    });
    const html = docToHTML(json);
    expect(html).toContain('render me');
    expect(html).toContain('data-author="77"');
  });
});
