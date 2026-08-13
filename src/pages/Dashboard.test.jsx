import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import Dashboard from './Dashboard';

vi.mock('../api', () => ({ api: { get: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

const lecturerPayload = {
  assignments: [
    {
      id: 1,
      title: 'Group Essay',
      is_group_work: 1,
      due_date: '2026-09-01T00:00:00.000Z',
      group_count: 2,
      submitted_group_count: 1,
      flagged_group_count: 1,
      submitted_count: 0,
    },
    {
      id: 2,
      title: 'Reading Response',
      is_group_work: 0,
      due_date: null,
      group_count: 0,
      submitted_group_count: 0,
      flagged_group_count: 0,
      submitted_count: 3,
    },
  ],
};

const studentPayload = {
  assignments: [
    { id: 3, title: 'Individual Done', is_group_work: 0, due_date: null, submission_id: 10, submission_status: 'submitted' },
    { id: 4, title: 'Individual Draft', is_group_work: 0, due_date: null, submission_status: 'draft' },
    { id: 5, title: 'Group Together', is_group_work: 1, due_date: null },
  ],
};

describe('Dashboard (lecturer)', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('renders a calm header, aggregate chips, and the flagged chip when present', async () => {
    api.get.mockResolvedValue(lecturerPayload);
    useAuth.mockReturnValue({ user: { role: 'lecturer', name: 'Lee Lecturer' } });
    renderDashboard();

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Submitted work and anything that needs your attention.')).toBeInTheDocument();

    // Group aggregates + flag.
    expect(screen.getByText('2 groups · 1 submitted')).toBeInTheDocument();
    expect(screen.getByText('1 group submitted with an incomplete member')).toBeInTheDocument();
    // Individual aggregate.
    expect(screen.getByText('3 submitted')).toBeInTheDocument();

    // Attachment points of the rows.
    expect(screen.getByRole('heading', { name: 'Group Essay' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reading Response' })).toBeInTheDocument();

    // "New Assignment" action, ≥44px button.
    const create = screen.getByRole('button', { name: 'New Assignment' });
    expect(create).toBeInTheDocument();

    // Rows link to the existing detail routes via assignmentLink(a, role).
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/assignments/1');
    expect(hrefs).toContain('/assignments/2');
  });

  it('does not show the flagged chip when there is nothing flagged', async () => {
    api.get.mockResolvedValue({
      assignments: [{
        id: 9,
        title: 'Quiet Group',
        is_group_work: 1,
        due_date: null,
        group_count: 1,
        submitted_group_count: 1,
        flagged_group_count: 0,
        submitted_count: 0,
      }],
    });
    useAuth.mockReturnValue({ user: { role: 'lecturer', name: 'Lee Lecturer' } });
    renderDashboard();

    await screen.findByRole('heading', { name: 'Quiet Group' });
    expect(screen.getByText('1 group · 1 submitted')).toBeInTheDocument();
    expect(screen.queryByText(/incomplete member/)).not.toBeInTheDocument();
  });

  it('shows a calm empty state when there are no assignments', async () => {
    api.get.mockResolvedValue({ assignments: [] });
    useAuth.mockReturnValue({ user: { role: 'lecturer', name: 'Lee Lecturer' } });
    renderDashboard();

    expect(await screen.findByText(/No assignments yet — create one to get started/)).toBeInTheDocument();
  });
});

describe('Dashboard (student)', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('greets the student and renders per-row status chips', async () => {
    api.get.mockResolvedValue(studentPayload);
    useAuth.mockReturnValue({ user: { role: 'student', name: 'Ada Lovelace' } });
    renderDashboard();

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome, Ada' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    expect(screen.getByRole('heading', { name: 'Individual Done' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Individual Draft' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Group Together' })).toBeInTheDocument();

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Group work')).toBeInTheDocument();

    const hrefs = screen.getAllByRole('link').map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/submissions/3');
    expect(hrefs).toContain('/assignments/4');
    expect(hrefs).toContain('/group/5');
  });

  it('shows a calm empty state', async () => {
    api.get.mockResolvedValue({ assignments: [] });
    useAuth.mockReturnValue({ user: { role: 'student', name: 'Ada Lovelace' } });
    renderDashboard();

    expect(await screen.findByText('No assignments yet')).toBeInTheDocument();
    expect(screen.getByText('When your lecturer creates one, it will appear here.')).toBeInTheDocument();
  });
});