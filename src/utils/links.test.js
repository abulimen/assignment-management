import { describe, it, expect } from 'vitest';
import { assignmentLink } from './links';

const group = { id: 7, is_group_work: 1 };
const individualWithSub = { id: 8, is_group_work: 0, submission_id: 42 };
const individualNoSub = { id: 9, is_group_work: 0 };

describe('assignmentLink — dashboard routing by role', () => {
  it('students open group assignments on the group page', () => {
    expect(assignmentLink(group, 'student')).toBe('/group/7');
  });

  it('lecturers open group assignments on the assignment page (submission list), never the student group hub', () => {
    expect(assignmentLink(group, 'lecturer')).toBe('/assignments/7');
  });

  it('resumes an existing individual submission', () => {
    expect(assignmentLink(individualWithSub, 'student')).toBe('/submissions/8');
  });

  it('opens the assignment page when nothing exists yet', () => {
    expect(assignmentLink(individualNoSub, 'student')).toBe('/assignments/9');
    expect(assignmentLink(individualNoSub, 'lecturer')).toBe('/assignments/9');
  });
});
