// Sections in the realtime layer: new docs are seeded with one empty
// section, legacy flat live docs migrate on load, section creation and
// moves converge between clients, and headless export understands sections.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import { docToProseMirrorJSON, docToHTML, survivingCharsByAuthor } from '../src/export.js';
import {
  getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET,
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

function connect(groupId, userId) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token: signJwt({ sub: userId, role: 'student' }, TEST_JWT_SECRET),
  });
  return new Promise((resolve) => {
    provider.on('synced', () => resolve({ document, provider }));
    setTimeout(() => resolve({ document, provider }), 8000);
  });
}

// Structural outline of a client's fragment: [{ name, id, children: [...] }]
function outline(document) {
  return document.getXmlFragment('default').toArray().map((el) => ({
    name: el.nodeName,
    id: el.nodeName === 'section' ? el.getAttribute('id') : null,
    children: el.toArray ? el.toArray().map((c) => c.nodeName) : [],
  }));
}

function makeSection(id) {
  const section = new Y.XmlElement('section');
  section.setAttribute('id', id);
  const title = new Y.XmlElement('sectionTitle');
  const para = new Y.XmlElement('paragraph');
  section.insert(0, [title, para]);
  return section;
}

async function seedFlatLegacyDoc(groupId, text) {
  // Write a FLAT doc (pre-sections era) straight into collab_documents.
  const ydoc = new Y.Doc();
  const frag = ydoc.getXmlFragment('default');
  const para = new Y.XmlElement('paragraph');
  const t = new Y.XmlText(text);
  para.insert(0, [t]);
  frag.insert(0, [para]);
  await pool.query(
    'INSERT INTO collab_documents (document_name, doc) VALUES (?, ?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)',
    [`group:${groupId}`, Buffer.from(Y.encodeStateAsUpdate(ydoc))],
  );
}

describe('sections in the realtime layer', () => {
  it('seeds a brand-new document with exactly one empty section', async () => {
    const seeded = await seedGroup(pool);
    const { document, provider } = await connect(seeded.groupId, seeded.memberIds[0]);

    await waitFor(async () => outline(document).length > 0);
    const o = outline(document);
    expect(o).toHaveLength(1);
    expect(o[0].name).toBe('section');
    expect(o[0].id).toBeTruthy();
    expect(o[0].children[0]).toBe('sectionTitle');

    provider.destroy();
  });

  it('migrates a legacy flat live document into one section on load', async () => {
    const seeded = await seedGroup(pool);
    await seedFlatLegacyDoc(seeded.groupId, 'legacy group words');

    const { document, provider } = await connect(seeded.groupId, seeded.memberIds[0]);
    await waitFor(async () => outline(document).length > 0);
    const o = outline(document);
    expect(o).toHaveLength(1);
    expect(o[0].name).toBe('section');
    expect(o[0].children).toContain('paragraph');
    // Legacy text survived the migration.
    expect(document.getXmlFragment('default').toString()).toContain('legacy group words');
    provider.destroy();
    await new Promise((r) => setTimeout(r, 400));

    // The migrated structure was persisted: a second client sees sections
    // even though the first client left.
    const second = await connect(seeded.groupId, seeded.memberIds[1]);
    await waitFor(async () => outline(second.document).length > 0);
    expect(outline(second.document)[0].name).toBe('section');
    expect(second.document.getXmlFragment('default').toString()).toContain('legacy group words');
    second.provider.destroy();
  });

  it('two clients creating sections converge on the same structure', async () => {
    const seeded = await seedGroup(pool);
    const a = await connect(seeded.groupId, seeded.memberIds[0]);
    const b = await connect(seeded.groupId, seeded.memberIds[1]);
    await waitFor(async () => outline(a.document).length > 0);
    await waitFor(async () => outline(b.document).length > 0);

    a.document.getXmlFragment('default').push([makeSection('sec-from-a')]);
    await new Promise((r) => setTimeout(r, 400));
    b.document.getXmlFragment('default').push([makeSection('sec-from-b')]);
    await new Promise((r) => setTimeout(r, 600));

    const oa = outline(a.document);
    const ob = outline(b.document);
    expect(oa.map((s) => s.id).sort()).toEqual(ob.map((s) => s.id).sort());
    expect(oa).toHaveLength(3); // seeded + A's + B's
    expect(oa.map((s) => s.id)).toContain('sec-from-a');
    expect(oa.map((s) => s.id)).toContain('sec-from-b');

    a.provider.destroy();
    b.provider.destroy();
  });

  it('moving a section converges between clients', async () => {
    const seeded = await seedGroup(pool);
    const a = await connect(seeded.groupId, seeded.memberIds[0]);
    await waitFor(async () => outline(a.document).length > 0);
    const frag = a.document.getXmlFragment('default');
    frag.push([makeSection('sec-move-1')]);
    frag.push([makeSection('sec-move-2')]);
    await new Promise((r) => setTimeout(r, 400));

    const b = await connect(seeded.groupId, seeded.memberIds[1]);
    await waitFor(async () => outline(b.document).length >= 3);

    // A reorders the first section to the end. This mirrors what
    // y-prosemirror does for the frontend's moveSection command: delete +
    // insert of new (cloned) content — Yjs cannot re-insert integrated items.
    const firstId = frag.get(0).getAttribute('id');
    const clone = frag.get(0).clone();
    a.document.transact(() => {
      frag.delete(0, 1);
      frag.insert(frag.length, [clone]);
    });
    await new Promise((r) => setTimeout(r, 600));

    const oa = outline(a.document).map((s) => s.id);
    const ob = outline(b.document).map((s) => s.id);
    expect(oa).toEqual(ob);
    expect(oa[oa.length - 1]).toBe(firstId);

    a.provider.destroy();
    b.provider.destroy();
  });

  it('headless export understands sections', async () => {
    const ydoc = new Y.Doc();
    const frag = ydoc.getXmlFragment('default');
    const section = makeSection('sec-export');
    frag.insert(0, [section]);
    // Put authored text into the section's paragraph. Formatting is applied
    // AFTER integration — the same order y-prosemirror uses when syncing
    // TipTap marks (formatting a detached text loses its attributes).
    const para = section.get(1);
    const t = new Y.XmlText('exported section text');
    para.insert(0, [t]);
    t.format(0, t.length, { author: { authorId: 31 } });

    const json = docToProseMirrorJSON(ydoc);
    expect(json.type).toBe('doc');
    expect(json.content[0].type).toBe('section');
    expect(json.content[0].attrs.id).toBe('sec-export');
    expect(json.content[0].content[0].type).toBe('sectionTitle');

    const html = docToHTML(json);
    expect(html).toContain('<section');
    expect(html).toContain('data-section-id="sec-export"');
    expect(html).toContain('exported section text');

    expect(survivingCharsByAuthor(json)[31]).toBe('exported section text'.length);
  });
});
