import { encodeId } from './id';

// Dashboard routing per role. Group assignments: students manage their group
// on the group hub; lecturers review submissions on the assignment page.
export function assignmentLink(a, role) {
  const encId = encodeId(a.id);
  const isGroup = a.is_group_work == 1 || a.is_group_work === true;
  if (isGroup) {
    return role === 'lecturer' ? `/assignments/${encId}` : `/group/${encId}`;
  }
  return a.submission_id ? `/submissions/${encId}` : `/assignments/${encId}`;
}

export function courseLink(c) {
  const id = typeof c === 'object' && c !== null ? c.id : c;
  return `/courses/${encodeId(id)}`;
}

export function reviewLink(s) {
  const id = typeof s === 'object' && s !== null ? s.id : s;
  return `/review/${encodeId(id)}`;
}
