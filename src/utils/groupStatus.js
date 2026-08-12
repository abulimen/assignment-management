// Group contribution status helpers — pure functions, unit tested.
// MySQL is the source of truth for statuses; these only summarize.

export const STATUS_LABEL = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
};

// The submit gate: everyone must be Done for a normal submission.
export function statusSummary(members) {
  const list = members || [];
  const done = list.filter((m) => m.status === 'done');
  const notDone = list.filter((m) => m.status !== 'done');
  return {
    total: list.length,
    doneCount: done.length,
    allDone: list.length > 0 && done.length === list.length,
    notDone,
  };
}
