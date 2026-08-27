// Internal HTTP API — PHP talks to the collab server over loopback with a
// shared secret. Endpoints:
//   GET  /health                      — liveness
//   GET  /internal/doc/:groupId/state — canonical content hash (mark-Done)
//   POST /internal/doc/:groupId/seal  — freeze + snapshot (submission)
import http from 'node:http';
import * as Y from 'yjs';
import { docNameFor } from './server.js';
import {
  docToProseMirrorJSON, docContentSha256, docToHTML,
  survivingCharsByAuthor, docToPlainText,
} from './export.js';

export async function createInternalApi({ port = 8004, pool, hocuspocus, internalSecret }) {
  // Open the document whether or not it is currently loaded in memory.
  async function withDocument(documentName, fn) {
    const loaded = hocuspocus.documents.get(documentName);
    if (loaded) return fn(loaded);
    const direct = await hocuspocus.openDirectConnection(documentName);
    try {
      return await fn(direct.document);
    } finally {
      await direct.disconnect();
    }
  }

  // Submission is a sealing event: export the canonical doc, persist the
  // immutable snapshot, freeze the group durably, downgrade live
  // connections to read-only. Idempotent via groups.frozen_at.
  async function sealDocument(groupId, submissionId) {
    const [[group]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [groupId]);
    if (!group) {
      const err = new Error('Group not found');
      err.status = 404;
      throw err;
    }
    if (group.frozen_at) {
      const [[snap]] = await pool.query(
        'SELECT content_sha256 FROM group_doc_snapshots WHERE group_id = ?',
        [groupId],
      );
      return { sealed: true, alreadySealed: true, sha256: snap?.content_sha256 || null };
    }

    return withDocument(docNameFor(groupId), async (doc) => {
      // Bounded drain: let in-flight client updates land before exporting.
      await new Promise((r) => setTimeout(r, 300));

      const json = docToProseMirrorJSON(doc);
      const html = docToHTML(json);
      const sha256 = docContentSha256(doc);
      const contributions = survivingCharsByAuthor(json);
      const text = docToPlainText(json);
      const ydocState = Y.encodeStateAsUpdate(doc);

      await pool.query(
        `INSERT INTO group_doc_snapshots
           (group_id, submission_id, prosemirror_json, html, ydoc_state, content_sha256, contributions, frozen_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE submission_id = VALUES(submission_id)`,
        [groupId, submissionId, JSON.stringify(json), html, Buffer.from(ydocState), sha256, JSON.stringify(contributions)],
      );
      await pool.query(
        'UPDATE `groups` SET frozen_at = NOW() WHERE id = ? AND frozen_at IS NULL',
        [groupId],
      );
      // Persist the frozen doc state and downgrade every live connection.
      await pool.query(
        'INSERT INTO collab_documents (document_name, doc) VALUES (?, ?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)',
        [docNameFor(groupId), Buffer.from(ydocState)],
      );
      for (const { connection } of doc.connections.values()) {
        connection.readOnly = true;
      }

      return { sealed: true, alreadySealed: false, sha256, contributions, text };
    });
  }

  const readBody = (req) => new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', reject);
  });

  const server = http.createServer(async (req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.headers['x-internal-secret'] !== internalSecret) {
      return send(401, { error: 'unauthorized' });
    }

    try {
      if (req.method === 'GET' && req.url === '/health') {
        return send(200, { ok: true });
      }

      const stateMatch = /^\/internal\/doc\/(\d+)\/state$/.exec(req.url || '');
      if (req.method === 'GET' && stateMatch) {
        const groupId = Number(stateMatch[1]);
        const [[group]] = await pool.query('SELECT id FROM `groups` WHERE id = ?', [groupId]);
        if (!group) return send(404, { error: 'Group not found' });
        const sha256 = await withDocument(docNameFor(groupId), (doc) => docContentSha256(doc));
        return send(200, { groupId, sha256 });
      }

      const sealMatch = /^\/internal\/doc\/(\d+)\/seal$/.exec(req.url || '');
      if (req.method === 'POST' && sealMatch) {
        const groupId = Number(sealMatch[1]);
        const body = await readBody(req);
        const submissionId = Number(body.submission_id || 0);
        if (!submissionId) return send(400, { error: 'submission_id required' });
        const result = await sealDocument(groupId, submissionId);
        return send(200, result);
      }

      send(404, { error: 'not found' });
    } catch (err) {
      send(err.status || 500, { error: err.message });
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
