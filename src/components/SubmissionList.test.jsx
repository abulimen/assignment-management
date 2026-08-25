import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubmissionList from './SubmissionList';

// Regression: a sealed GROUP submission is attributed to the leader who
// clicked Submit (submissions.student_id), but the list must present it as
// the group's work — not as the leader's individual submission.
describe('SubmissionList', () => {
  it('renders a group submission under its group name, with the leader as submitter', () => {
    render(
      <MemoryRouter>
        <SubmissionList
          submissions={[
            {
              id: 5,
              group_id: 1,
              group_name: 'Group C',
              student_id: 9,
              student_name: 'Abulimen',
              student_email: 'abulimensamuel2@gmail.com',
              status: 'submitted',
            },
          ]}
        />,
      </MemoryRouter>,
    );
    expect(screen.getByText('Group C')).toBeTruthy();
    expect(screen.getByText(/Submitted by Abulimen/)).toBeTruthy();
  });

  it('renders a solo submission under the student name (unchanged)', () => {
    render(
      <MemoryRouter>
        <SubmissionList
          submissions={[
            {
              id: 6,
              student_id: 12,
              student_name: 'Zainab',
              student_email: 'z@x.com',
              status: 'submitted',
            },
          ]}
        />,
      </MemoryRouter>,
    );
    expect(screen.getByText('Zainab')).toBeTruthy();
  });
});
