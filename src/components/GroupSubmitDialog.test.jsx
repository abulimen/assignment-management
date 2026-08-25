import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupSubmitDialog from './GroupSubmitDialog';

describe('GroupSubmitDialog', () => {
  it('renders all-done confirmation when everyone is Done', () => {
    const summary = {
      total: 3,
      doneCount: 3,
      allDone: true,
      notDone: [],
    };
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <GroupSubmitDialog
        summary={summary}
        isOverride={false}
        busy={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/All/i)).toBeInTheDocument();
    expect(screen.getByText(/3 members/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit — Everyone Complete/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Submit — Everyone Complete/i }));
    expect(onConfirm).toHaveBeenCalledWith(null);
  });

  it('renders override dialog requiring reason when someone is not Done', () => {
    const summary = {
      total: 2,
      doneCount: 1,
      allDone: false,
      notDone: [{ student_id: 116, student_name: 'Sule', status: 'not_started' }],
    };
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <GroupSubmitDialog
        summary={summary}
        isOverride={true}
        busy={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Sule')).toBeInTheDocument();
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Submit Anyway as Leader/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Deadline reached/i);
    fireEvent.change(textarea, { target: { value: 'Deadline reached by team' } });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(onConfirm).toHaveBeenCalledWith('Deadline reached by team');
  });

  it('handles missing or alternate props safely without throwing', () => {
    const group = {
      id: 1,
      members: [
        { student_id: 1, student_name: 'Alice', status: 'done' },
        { student_id: 2, student_name: 'Bob', status: 'done' },
      ],
    };
    const onSubmit = vi.fn();

    render(
      <GroupSubmitDialog
        group={group}
        busy={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
  });
});
