// Dashboard routing per role. Group assignments: students manage their group
// on the group hub; lecturers review submissions on the assignment page.
export function assignmentLink(a, role) {
  const isGroup = a.is_group_work == 1 || a.is_group_work === true;
  if (isGroup) {
    return role === 'lecturer' ? `/assignments/${a.id}` : `/group/${a.id}`;
  }
  return a.submission_id ? `/submissions/${a.id}` : `/assignments/${a.id}`;
}
