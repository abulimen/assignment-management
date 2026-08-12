// Hocuspocus realtime collaboration server for group assignments.
//
// One Yjs document per group ("group:<id>"). Authentication reuses the
// platform JWT (HS256, shared JWT_SECRET) plus a group-membership check.
// Documents persist to MySQL (collab_documents). Frozen groups (submitted)
// stay openable but read-only — the freeze epoch lives in groups.frozen_at,
// so it survives server restarts.
import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { verifyJwt } from './jwt.js';
import { createPool } from './db.js';
import { createInternalApi } from './internal.js';

export const DOC_PREFIX = 'group:';

export function docNameFor(groupId) {
  return `${DOC_PREFIX}${groupId}`;
}

export function parseDocName(documentName) {
  const m = /^group:(\d+)$/.exec(documentName || '');
  return m ? Number(m[1]) : null;
}

export async function createCollabServer({
  wsPort = Number(process.env.COLLAB_WS_PORT || 8003),
  internalPort = Number(process.env.COLLAB_INTERNAL_PORT || 8004),
  db,
  jwtSecret = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
  internalSecret = process.env.INTERNAL_API_SECRET || 'local-dev-internal-secret',
  quiet = true,
  attributionThrottleMs = 2000,
} = {}) {
  const pool = createPool(db);

  // --- Server-anchored attribution ---------------------------------------
  // Every applied update is credited to the AUTHENTICATED connection — never
  // to client-supplied data. Writes are throttled per user/document and
  // flushed on disconnect. Status transitions piggyback the same flush:
  //   not_started -> in_progress  on first server-observed edit
  //   done        -> in_progress  when a member edits after marking Done
  const docSeq = new Map(); // documentName -> next update_seq
  const pendingAttr = new Map(); // `${documentName}:${userId}` -> { bytes, lastFlushAt }

  async function flushAttribution(documentName, userId) {
    const key = `${documentName}:${userId}`;
    const pend = pendingAttr.get(key);
    if (!pend || pend.bytes === 0) return;
    const groupId = parseDocName(documentName);
    if (!groupId) return;

    const seq = (docSeq.get(documentName) || 0) + 1;
    docSeq.set(documentName, seq);

    await pool.query(
      'INSERT INTO collab_attribution (group_id, student_id, update_seq, received_at, update_bytes) VALUES (?, ?, ?, NOW(3), ?)',
      [groupId, userId, seq, pend.bytes],
    );

    const [[st]] = await pool.query(
      'SELECT status FROM group_member_status WHERE group_id = ? AND student_id = ?',
      [groupId, userId],
    );
    if (!st) {
      await pool.query(
        "INSERT IGNORE INTO group_member_status (group_id, student_id, status, last_activity_at) VALUES (?, ?, 'in_progress', NOW())",
        [groupId, userId],
      );
    } else if (st.status === 'done') {
      // Edited after marking Done: the commitment is revoked.
      await pool.query(
        "UPDATE group_member_status SET status = 'in_progress', done_at = NULL, done_doc_sha = NULL, last_activity_at = NOW() WHERE group_id = ? AND student_id = ?",
        [groupId, userId],
      );
    } else if (st.status === 'not_started') {
      await pool.query(
        "UPDATE group_member_status SET status = 'in_progress', last_activity_at = NOW() WHERE group_id = ? AND student_id = ?",
        [groupId, userId],
      );
    } else {
      await pool.query(
        'UPDATE group_member_status SET last_activity_at = NOW() WHERE group_id = ? AND student_id = ?',
        [groupId, userId],
      );
    }

    pend.bytes = 0;
    pend.lastFlushAt = Date.now();
  }

  const hocuspocus = new Hocuspocus({
    name: 'assignment-collab',
    quiet,
    debounce: 200,
    maxDebounce: 2000,
    stopOnSignals: false,

    async onAuthenticate({ token, context, documentName, connection }) {
      const groupId = parseDocName(documentName);
      if (!groupId) throw new Error('Invalid document name');

      const payload = verifyJwt(token, jwtSecret);
      if (!payload || !Number.isInteger(payload.sub)) throw new Error('Invalid token');

      // MVP review scope: only group members may open the document.
      if (payload.role !== 'student') throw new Error('Only students can open the group editor');
      const [[membership]] = await pool.query(
        'SELECT student_id FROM group_members WHERE group_id = ? AND student_id = ?',
        [groupId, payload.sub],
      );
      if (!membership) throw new Error('Not a member of this group');

      const [[group]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [groupId]);
      if (!group) throw new Error('Group not found');

      context.userId = payload.sub;
      context.role = payload.role;
      context.groupId = groupId;
      context.readOnly = !!group.frozen_at;
      // onConnect already ran (before auth) with an empty context, so the
      // read-only flag must be set here, where the freeze check happens.
      if (context.readOnly) connection.readOnly = true;
      return context;
    },

    async onConnect({ context, connection }) {
      // Context is populated later in onAuthenticate; keep this hook for the
      // read-only case only (e.g. if ordering ever changes).
      if (context.readOnly) connection.readOnly = true;
      return context;
    },

    async onChange({ context, documentName, update }) {
      const userId = context?.userId;
      if (!userId) return; // server-side / direct-connection changes
      const key = `${documentName}:${userId}`;
      const pend = pendingAttr.get(key) || { bytes: 0, lastFlushAt: 0 };
      pend.bytes += update ? update.byteLength || update.length || 0 : 0;
      pendingAttr.set(key, pend);
      if (Date.now() - pend.lastFlushAt >= attributionThrottleMs) {
        await flushAttribution(documentName, userId);
      }
    },

    async onDisconnect({ context, documentName }) {
      const userId = context?.userId;
      if (!userId) return;
      try {
        await flushAttribution(documentName, userId);
      } catch (err) {
        // Fail loud in logs, never lose silently beyond this point.
        console.error('[collab] attribution flush failed:', err.message);
      }
    },

    extensions: [
      new Database({
        fetch: async ({ documentName }) => {
          const [rows] = await pool.query(
            'SELECT doc FROM collab_documents WHERE document_name = ?',
            [documentName],
          );
          if (!rows.length) return null;
          return Uint8Array.from(rows[0].doc);
        },
        store: async ({ documentName, state }) => {
          await pool.query(
            'INSERT INTO collab_documents (document_name, doc) VALUES (?, ?) ON DUPLICATE KEY UPDATE doc = VALUES(doc)',
            [documentName, Buffer.from(state)],
          );
        },
      }),
    ],
  });

  await hocuspocus.listen(wsPort);

  const internal = await createInternalApi({
    port: internalPort,
    pool,
    hocuspocus,
    internalSecret,
  });

  return {
    wsPort: hocuspocus.address.port,
    internalPort: internal.port,
    hocuspocus,
    pool,
    async destroy() {
      await internal.close();
      await hocuspocus.destroy();
      await pool.end();
    },
  };
}
