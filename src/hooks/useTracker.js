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

  enqueueRef.current = enqueue;

  const plugin = useMemo(() => new Plugin({
    appendTransaction: (transactions, oldState, newState) => {
      const enq = enqueueRef.current;
      if (!enq) return null;

      for (const tr of transactions) {
        // Check steps directly for mark and structural changes
        for (const step of tr.steps) {
          const stepJson = step.toJSON();

          // Format: AddMarkStep / RemoveMarkStep
          if (stepJson.stepType === 'addMark') {
            enq('format', {
              mark: stepJson.mark?.type || stepJson.mark,
              from: stepJson.from,
              to: stepJson.to,
              active: true,
            });
            continue;
          }
          if (stepJson.stepType === 'removeMark') {
            enq('format', {
              mark: stepJson.mark?.type || stepJson.mark,
              from: stepJson.from,
              to: stepJson.to,
              active: false,
            });
            continue;
          }
        }

        // Detect Enter key: paragraph count increased
        const oldChildCount = oldState.doc.content.childCount;
        const newChildCount = newState.doc.content.childCount;
        if (newChildCount > oldChildCount && tr.docChanged) {
          // New paragraph created — find the split point from the first replace step
          for (const step of tr.steps) {
            const stepJson = step.toJSON();
            if (stepJson.stepType === 'replace') {
              // The split position is where the new paragraph was inserted
              enq('newline', { position: stepJson.from });
              break;
            }
          }
        }

        // Text content changes
        if (tr.docChanged) {
          for (const step of tr.steps) {
            const stepJson = step.toJSON();
            if (stepJson.stepType === 'replace') {
              const from = stepJson.from;
              const to = stepJson.to;
              const deleted = to - from;

              let inserted = '';
              if (stepJson.slice && stepJson.slice.content) {
                // Check if this is a structural change (new paragraph) — skip text extraction
                const isStructural = stepJson.slice.content.some(
                  n => (n.type === 'paragraph' || n.type === 'heading') && (!n.content || n.content.length === 0 || n.content.every(c => !c.text))
                );
                if (isStructural && deleted === 0) {
                  // This is an Enter key or similar structural change — already handled above
                  continue;
                }
                try {
                  inserted = newState.doc.textBetween(from, from + getSliceSize(stepJson.slice), '\n');
                } catch (e) {
                  inserted = extractText(stepJson.slice.content);
                }
              }

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

// Extract text from ProseMirror slice content (handles nested nodes)
function extractText(content) {
  let text = '';
  for (const node of content) {
    if (node.text) {
      text += node.text;
    } else if (node.content) {
      text += extractText(node.content);
    }
  }
  return text;
}

function getSliceSize(slice) {
  if (!slice || !slice.content) return 0;
  let size = 0;
  for (const node of slice.content) {
    if (node.text) {
      size += node.text.length;
    } else if (node.content) {
      for (const child of node.content) {
        if (child.text) size += child.text.length;
      }
      size += 1;
    }
  }
  return size;
}