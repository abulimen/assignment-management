import { describe, it, expect } from 'vitest';
import { statusSummary, STATUS_LABEL } from './groupStatus';

const member = (id, status) => ({ student_id: id, student_name: `S${id}`, status });

describe('statusSummary — the submit gate math', () => {
  it('empty group is never submittable', () => {
    const s = statusSummary([]);
    expect(s.total).toBe(0);
    expect(s.allDone).toBe(false);
  });

  it('all Done → allDone true, nobody in notDone', () => {
    const s = statusSummary([member(1, 'done'), member(2, 'done'), member(3, 'done')]);
    expect(s.total).toBe(3);
    expect(s.doneCount).toBe(3);
    expect(s.allDone).toBe(true);
    expect(s.notDone).toHaveLength(0);
  });

  it('mixed statuses → counts and names the not-Done members', () => {
    const s = statusSummary([
      member(1, 'done'),
      member(2, 'done'),
      member(3, 'in_progress'),
      member(4, 'not_started'),
    ]);
    expect(s.doneCount).toBe(2);
    expect(s.allDone).toBe(false);
    expect(s.notDone.map(m => m.student_id)).toEqual([3, 4]);
  });

  it('missing status is treated as not Done', () => {
    const s = statusSummary([member(1, 'done'), { student_id: 2, student_name: 'S2' }]);
    expect(s.allDone).toBe(false);
    expect(s.notDone).toHaveLength(1);
  });

  it('labels exist for all three states', () => {
    expect(STATUS_LABEL.not_started).toBeTruthy();
    expect(STATUS_LABEL.in_progress).toBeTruthy();
    expect(STATUS_LABEL.done).toBeTruthy();
  });
});
