// Headless export of a shared Y.Doc — the Node server is the only component
// that can read Yjs state, so PHP asks it for canonical JSON + content hash.
import { createHash } from 'node:crypto';
import { yDocToProsemirrorJSON } from 'y-prosemirror';

// TipTap's Collaboration extension binds the document to the 'default' field.
export const TIPTAP_FIELD = 'default';

export function docToProseMirrorJSON(ydoc) {
  return yDocToProsemirrorJSON(ydoc, TIPTAP_FIELD);
}

// Canonical content hash: sha256 over the exported ProseMirror JSON.
// Deterministic for identical content regardless of edit history/tombstones.
export function docContentSha256(ydoc) {
  return createHash('sha256').update(JSON.stringify(docToProseMirrorJSON(ydoc))).digest('hex');
}
