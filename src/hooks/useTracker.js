import { useRef, useCallback, useMemo } from 'react';
import { Plugin } from '@tiptap/pm/state';
import { api } from '../api';

// ProseMirror Step Replay tracker.
// Captures raw ProseMirror transaction steps (serialized via Step.toJSON())
// and stores them. Playback replays these steps into a hidden editor,
// which reproduces the exact document state — formatting, paragraphs, marks —
// at every point in time. No text extraction, no position math.

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

  const enqueue = useCallback((type, data, stepsJson, selFrom, selTo) => {
    seq.current += 1;
    buffer.current.push({
      type,
      data,
      steps_json: stepsJson,
      selection_from: selFrom,
      selection_to: selTo,
      occurred_at: Date.now() / 1000,
      sequence: seq.current,
    });
    eventCount.current += 1;

    // Snapshot for analytics (not for replay — replay uses raw steps)
    if (eventCount.current % SNAPSHOT_INTERVAL === 0 && snapshotRef.current) {
      const editor = snapshotRef.current();
      if (editor) {
        seq.current += 1;
        buffer.current.push({
          type: 'snapshot',
          data: { doc: editor.getJSON() },
          steps_json: null,
          selection_from: null,
          selection_to: null,
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

  // Use a view plugin (not appendTransaction) to observe transactions passively.
  // appendTransaction would MODIFY transactions, causing side effects during replay.
  const plugin = useMemo(() => new Plugin({
    view: {
      update: (view, prevState) => {
        const enq = enqueueRef.current;
        if (!enq) return;

        const tr = view.composing ? null : null;
        // Get the last transaction from the view's state transition
        // The view doesn't expose the transaction directly, so we use
        // a different approach: we observe via the editor's onUpdate callback
        // in Editor.jsx, which has access to the transaction.
      },
    },
  }), []);

  // The actual capture happens via the editor's onUpdate callback,
  // which receives the transaction. We expose a function for Editor.jsx
  // to call with the raw transaction.
  const captureTransaction = useCallback((tr) => {
    const enq = enqueueRef.current;
    if (!enq || !tr || !tr.docChanged) return;

    // Serialize the steps
    const stepsJson = JSON.stringify(tr.steps.map(s => s.toJSON()));
    const selFrom = tr.selection.from;
    const selTo = tr.selection.to;

    // Classify for legacy stats support (events.php still uses type field)
    let type = 'step';
    let data = {};

    // Check step types for classification
    for (const step of tr.steps) {
      const stepJson = step.toJSON();
      if (stepJson.stepType === 'replace') {
        const inserted = tr.doc.textBetween(stepJson.from, stepJson.from + (stepJson.to - stepJson.from === 0 ? (stepJson.slice?.content?.[0]?.text?.length || 0) : 0), '\n');
        if (stepJson.to - stepJson.from > 0) {
          type = 'delete';
          data = { position: stepJson.from, length: stepJson.to - stepJson.from };
        }
      }
    }

    enq(type, data, stepsJson, selFrom, selTo);
  }, []);

  return { plugin, flush, enqueue, captureTransaction, setEditorRef: (fn) => { snapshotRef.current = fn; } };
}