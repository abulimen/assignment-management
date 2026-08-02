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
  // to call with the raw transaction and optional pending paste info.
  const captureTransaction = useCallback((tr, pendingPaste = null) => {
    const enq = enqueueRef.current;
    if (!enq || !tr || !tr.docChanged) return;

    // Serialize the steps
    const stepsJson = JSON.stringify(tr.steps.map(s => s.toJSON()));
    const selFrom = tr.selection.from;
    const selTo = tr.selection.to;

    // Classify for stats + detect pastes
    let type = 'step';
    let data = {};

    // Check step types for classification
    for (const step of tr.steps) {
      const stepJson = step.toJSON();
      if (stepJson.stepType === 'replace') {
        const from = stepJson.from;
        const to = stepJson.to;
        const deleted = to - from;

        // Extract inserted text length
        let insertedLen = 0;
        if (stepJson.slice?.content) {
          insertedLen = countSliceText(stepJson.slice.content);
        }

        if (deleted > 0 && insertedLen === 0) {
          // Pure deletion
          type = 'delete';
          data = { position: from, length: deleted };
        } else if (insertedLen > 1) {
          // Multi-char insert — could be paste
          if (pendingPaste) {
            // External clipboard paste detected
            type = 'paste';
            data = {
              external_paste: true,
              pasted_text: pendingPaste.text,
              pasted_text_length: pendingPaste.text.length,
              is_html: pendingPaste.isHtml,
              position: from,
              source: 'clipboard',
            };
          } else {
            // Multi-char insert without clipboard event — autocomplete, IME, or internal copy
            type = 'paste';
            data = {
              external_paste: false,
              source: 'internal_or_autocomplete',
              position: from,
              inserted_length: insertedLen,
            };
          }
        } else if (deleted > 0 && insertedLen > 0) {
          // Replace (delete then insert)
          type = 'delete';
          data = { position: from, length: deleted };
        }
      }
    }

    enq(type, data, stepsJson, selFrom, selTo);
  }, []);

  return { plugin, flush, enqueue, captureTransaction, setEditorRef: (fn) => { snapshotRef.current = fn; } };
}

// Helper: count text length in a ProseMirror slice content array
function countSliceText(content) {
  let len = 0;
  for (const node of content) {
    if (node.text) {
      len += node.text.length;
    } else if (node.content) {
      len += countSliceText(node.content);
    }
  }
  return len;
}