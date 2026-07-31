import { useRef, useCallback, useMemo } from 'react';
import { Plugin } from '@tiptap/pm/state';
import { api } from '../api';

// ponytail: one plugin, flat dispatch. split when event types > 10.
// Snapshot every 30 events so playback can anchor without drifting.

const SNAPSHOT_INTERVAL = 30;

export function useTracker(submissionId, editorRef) {
  const buffer = useRef([]);
  const seq = useRef(0);
  const eventCount = useRef(0);
  const timer = useRef(null);
  const enqueueRef = useRef(null);
  const snapshotRef = useRef(null);

  const flush = useCallback(() => {
    if (buffer.current.length === 0) return;
    const events = [...buffer.current];
    buffer.current = [];
    api.post('events.php', { submission_id: submissionId, events }).catch(() => {});
  }, [submissionId]);

  const enqueue = useCallback((type, data) => {
    seq.current += 1;
    buffer.current.push({
      type,
      data,
      occurred_at: Date.now() / 1000,
      sequence: seq.current,
    });
    eventCount.current += 1;

    // Snapshot every N events
    if (eventCount.current % SNAPSHOT_INTERVAL === 0 && snapshotRef.current) {
      const editor = snapshotRef.current();
      if (editor) {
        seq.current += 1;
        buffer.current.push({
          type: 'snapshot',
          data: { doc: editor.getJSON() },
          occurred_at: Date.now() / 1000,
          sequence: seq.current,
        });
      }
    }

    if (!timer.current) {
      timer.current = setTimeout(() => {
        flush();
        timer.current = null;
      }, 5000);
    }
  }, [flush]);

  // Keep refs synced so the memoized plugin always calls latest closures
  enqueueRef.current = enqueue;

  // ponytail: memoized plugin, enqueue via ref. recreating would double-register.
  const plugin = useMemo(() => new Plugin({
    appendTransaction: (transactions, oldState, newState) => {
      const enq = enqueueRef.current;
      if (!enq) return null;

      for (const tr of transactions) {
        // Track formatting changes (marks added/removed)
        if (!tr.docChanged && tr.storedMarksSet) {
          // Mark toggle via toolbar — detect from selection
          const sel = tr.selection;
          const oldMarks = oldState.doc.resolve(sel.from).marks();
          const newMarks = newState.doc.resolve(sel.from).marks();
          // Compare mark types
          const oldTypes = oldMarks.map(m => m.type.name).sort().join(',');
          const newTypes = newMarks.map(m => m.type.name).sort().join(',');
          if (oldTypes !== newTypes) {
            // Find added marks
            for (const nm of newMarks) {
              if (!oldMarks.some(om => om.type.name === nm.type.name)) {
                enq('format', { mark: nm.type.name, from: sel.from, to: sel.to, active: true });
              }
            }
            for (const om of oldMarks) {
              if (!newMarks.some(nm => nm.type.name === om.type.name)) {
                enq('format', { mark: om.type.name, from: sel.from, to: sel.to, active: false });
              }
            }
          }
        }

        if (tr.docChanged) {
          for (const step of tr.steps) {
            const stepJson = step.toJSON();
            if (stepJson.stepType === 'replace') {
              const from = stepJson.from;
              const to = stepJson.to;
              const deleted = to - from;

              // Use textBetween to correctly extract multi-paragraph text
              // (slice.content[0].text only gets the first node's text, missing paragraphs)
              let inserted = '';
              if (stepJson.slice && stepJson.slice.content) {
                // Reconstruct from the slice content using ProseMirror's Fragment
                try {
                  // textBetween on newState gives us the inserted text across all nodes
                  inserted = newState.doc.textBetween(from, from + getSliceSize(stepJson.slice), '\n');
                } catch (e) {
                  // Fallback: try first content node
                  inserted = stepJson.slice.content[0]?.text || '';
                }
              }

              // Also check for marks on the inserted content (formatted paste)
              if (inserted && deleted === 0) {
                if (inserted.length === 1) {
                  enq('keystroke', { char: inserted, position: from });
                } else {
                  enq('paste', { text: inserted, position: from, source: 'clipboard' });
                }
              } else if (deleted > 0 && !inserted) {
                enq('delete', { position: from, length: deleted });
              } else if (deleted > 0 && inserted) {
                enq('delete', { position: from, length: deleted });
                if (inserted.length === 1) {
                  enq('keystroke', { char: inserted, position: from });
                } else {
                  enq('paste', { text: inserted, position: from, source: 'clipboard' });
                }
              }
            }
          }
        }

        // Track mark changes that happen WITH doc changes (e.g., formatting selected text)
        if (tr.docChanged) {
          const sel = tr.selection;
          if (sel.from !== sel.to) {
            // Selection exists — check for mark changes
            const oldMarks = oldState.doc.resolve(sel.from).marks();
            const newMarks = newState.doc.resolve(sel.from).marks();
            for (const nm of newMarks) {
              if (!oldMarks.some(om => om.type.name === nm.type.name)) {
                enq('format', { mark: nm.type.name, from: sel.from, to: sel.to, active: true });
              }
            }
          }
        }

        if (tr.selectionSet) {
          const oldFrom = oldState.selection.from;
          const newFrom = newState.selection.from;
          if (Math.abs(newFrom - oldFrom) > 50) {
            enq('cursor_jump', { from: oldFrom, to: newFrom });
          }
        }
      }
      return null;
    },
  }), []);

  return { plugin, flush, enqueue, setEditorRef: (fn) => { snapshotRef.current = fn; } };
}

// Helper: estimate the size of a ProseMirror slice from its JSON
function getSliceSize(slice) {
  if (!slice || !slice.content) return 0;
  let size = 0;
  for (const node of slice.content) {
    if (node.text) {
      size += node.text.length;
    } else if (node.content) {
      // It's a block node (paragraph, heading, etc.)
      for (const child of node.content) {
        if (child.text) size += child.text.length;
      }
      size += 1; // paragraph boundary
    }
  }
  return size;
}
