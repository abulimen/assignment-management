import { describe, it, expect } from 'vitest';
import { assignmentLink, courseLink, reviewLink } from './links';
import { encodeId } from './id';

const group = { id: 7, is_group_work: 1 };
const individualWithSub = { id: 8, is_group_work: 0, submission_id: 42 };
const individualNoSub = { id: 9, is_group_work: 0 };

describe('assignmentLink — dashboard routing by role', () => {
  it('students open group assignments on the group page', () => {
    expect(assignmentLink(group, 'student')).toBe(`/group/${encodeId(7)}`);
  });

  it('lecturers open group assignments on the assignment page (submission list), never the student group hub', () => {
    expect(assignmentLink(group, 'lecturer')).toBe(`/assignments/${encodeId(7)}`);
  });

  it('resumes an existing individual submission', () => {
    expect(assignmentLink(individualWithSub, 'student')).toBe(`/submissions/${encodeId(8)}`);
  });

  it('routes submitted individual assignment to reviewLink for students', () => {
    const submitted = { id: 8, is_group_work: 0, submission_id: 42, submission_status: 'submitted' };
    expect(assignmentLink(submitted, 'student')).toBe(`/review/${encodeId(42)}`);
  });

  it('opens the assignment page when nothing exists yet', () => {
    expect(assignmentLink(individualNoSub, 'student')).toBe(`/assignments/${encodeId(9)}`);
    expect(assignmentLink(individualNoSub, 'lecturer')).toBe(`/assignments/${encodeId(9)}`);
  });

  it('generates obfuscated courseLink', () => {
    expect(courseLink({ id: 1 })).toBe(`/courses/${encodeId(1)}`);
    expect(courseLink(2)).toBe(`/courses/${encodeId(2)}`);
  });

  it('generates obfuscated reviewLink', () => {
    expect(reviewLink({ id: 1 })).toBe(`/review/${encodeId(1)}`);
    expect(reviewLink(9)).toBe(`/review/${encodeId(9)}`);
  });
});

