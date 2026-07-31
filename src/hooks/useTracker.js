import { useRef, useCallback } from 'react';
import { Plugin } from '@tiptap/pm/state';
import { api } from '../api';

// ponytail: one plugin, flat dispatch. split when event types > 10.

export function useTracker(submissionId) {
  const buffer = useRef([]);
  const seq = useRef(0);
  const timer = useRef(null);

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
    if (!timer.current) {
      timer.current = setTimeout(() => {
        flush();
        timer.current = null;
      }, 5000);
    }
  }, [flush]);

  const plugin = new Plugin({
    appendTransaction: (transactions, oldState, newState) => {
      for (const tr of transactions) {
        if (tr.docChanged) {
          for (const step of tr.steps) {
            const stepJson = step.toJSON();
            if (stepJson.stepType === 'replace') {
              const from = stepJson.from;
              const to = stepJson.to;
              const slice = stepJson.slice;
              const inserted = slice?.content?.[0]?.text || '';
              const deleted = to - from;

              if (inserted && deleted === 0) {
                if (inserted.length === 1) {
                  enqueue('keystroke', { char: inserted, position: from });
                } else {
                  enqueue('paste', { text: inserted, position: from, source: 'clipboard' });
                }
              } else if (deleted > 0 && !inserted) {
                enqueue('delete', { position: from, length: deleted });
              } else if (deleted > 0 && inserted) {
                enqueue('delete', { position: from, length: deleted });
                if (inserted.length === 1) {
                  enqueue('keystroke', { char: inserted, position: from });
                } else {
                  enqueue('paste', { text: inserted, position: from, source: 'clipboard' });
                }
              }
            }
          }
        }
        if (tr.selectionSet) {
          const oldFrom = oldState.selection.from;
          const newFrom = newState.selection.from;
          if (Math.abs(newFrom - oldFrom) > 50) {
            enqueue('cursor_jump', { from: oldFrom, to: newFrom });
          }
        }
      }
      return null;
    },
  });

  return { plugin, flush, enqueue };
}