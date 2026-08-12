import { describe, it, expect } from 'vitest';
import { isRemoteSyncTransaction } from './yjsMeta';

// y-prosemirror applies remote peer updates (and Yjs undo/redo) as
// transactions carrying meta under the 'y-sync' plugin key. Local typing,
// pastes, and formatting carry no such meta.
const fakeTr = (metaByName) => ({
  getMeta: (name) => metaByName[name],
});

describe('isRemoteSyncTransaction', () => {
  it('detects y-prosemirror remote sync transactions', () => {
    expect(isRemoteSyncTransaction(fakeTr({ 'y-sync': { isChangeOrigin: true } }))).toBe(true);
  });

  it('detects y-sync undo/redo operations as remote (marks must survive)', () => {
    expect(isRemoteSyncTransaction(fakeTr({
      'y-sync': { isChangeOrigin: true, isUndoRedoOperation: true },
    }))).toBe(true);
  });

  it('returns false for plain local transactions', () => {
    expect(isRemoteSyncTransaction(fakeTr({}))).toBe(false);
    expect(isRemoteSyncTransaction(fakeTr({ authorOverride: true }))).toBe(false);
  });

  it('is safe against null/undefined/weird inputs', () => {
    expect(isRemoteSyncTransaction(null)).toBe(false);
    expect(isRemoteSyncTransaction(undefined)).toBe(false);
    expect(isRemoteSyncTransaction({})).toBe(false);
    expect(isRemoteSyncTransaction(fakeTr({ 'y-sync': undefined }))).toBe(false);
  });
});
