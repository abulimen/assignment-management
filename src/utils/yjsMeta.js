// In collaborative (Yjs) mode, y-prosemirror applies remote peer updates —
// and Yjs undo/redo — as ProseMirror transactions carrying meta under the
// 'y-sync' plugin key. Local typing/pastes never carry it. Both the tracker
// and AuthorOverride use this to leave remote-authored content alone.
export function isRemoteSyncTransaction(tr) {
  if (!tr || typeof tr.getMeta !== 'function') return false;
  return tr.getMeta('y-sync') != null;
}
