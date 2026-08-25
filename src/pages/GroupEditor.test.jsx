import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as Y from 'yjs';
import { encodeId } from '../utils/id';
import GroupEditor from './GroupEditor';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('../api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 9, name: 'Abulimen', role: 'student' } }),
}));

// Capture the Editor props so the test can assert the collaboration wiring.
const editorProps = vi.fn();
vi.mock('../components/Editor', () => ({
  default: (props) => {
    editorProps(props);
    return <div data-testid="editor-stub" />;
  },
}));
vi.mock('../components/EditorSkeleton', () => ({ default: () => <div>loading…</div> }));
vi.mock('../components/SectionPresenceChips', () => ({ default: () => null }));
vi.mock('../components/UserAvatar', () => ({ default: () => null }));
vi.mock('../components/BrandMark', () => ({ default: () => null }));

// Minimal HocuspocusProvider stand-in: records the doc name, no network.
const providerConfig = vi.fn();
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: class {
    constructor(config) {
      providerConfig(config);
      this.awareness = { getStates: () => new Map() };
    }
    setAwarenessField() {}
    destroy() {}
  },
}));

import { api } from '../api';

const group = {
  id: 1,
  name: 'Group C',
  leader_id: 9,
  assignment_id: 4,
  assignment_title: 'Write a report',
  status: 'in_progress',
  members: [
    { student_id: 9, student_name: 'Abulimen', email: 'a@x.com', status: 'in_progress' },
    { student_id: 116, student_name: 'Sule', email: 's@x.com', status: 'not_started' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ group });
  api.post.mockResolvedValue({ submission: { id: 99 } });
});

// Regression: GroupEditor must hand Editor a `collab` prop ({ ydoc, provider,
// user }) — Editor renders a plain LOCAL editor when that prop is missing,
// which silently disconnected the shared document (no sync, no cursors).
describe('GroupEditor', () => {
  it('binds the Editor to the shared Y.Doc via the collab prop', async () => {
    render(
      <MemoryRouter initialEntries={[`/group/${encodeId(1)}/edit`]}>
        <Routes>
          <Route path="/group/:groupId/edit" element={<GroupEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(editorProps).toHaveBeenCalled());
    const props = editorProps.mock.lastCall[0];
    expect(props.collab).toBeTruthy();
    expect(props.collab.ydoc).toBeInstanceOf(Y.Doc);
    expect(props.collab.provider).toBeTruthy();
    expect(props.collab.user).toMatchObject({ name: 'Abulimen' });
    expect(props.submissionId).toBe(99);
  });

  it('connects the provider with the server doc name group:<numericId>', async () => {
    render(
      <MemoryRouter initialEntries={[`/group/${encodeId(1)}/edit`]}>
        <Routes>
          <Route path="/group/:groupId/edit" element={<GroupEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(providerConfig).toHaveBeenCalled());
    const config = providerConfig.mock.lastCall[0];
    expect(config.name).toBe('group:1');
  });

  // Regression: the sealed state must key off groups.frozen_at (the column
  // the API returns) — group.status does not exist, so the Submit button used
  // to stay visible forever after a successful submission.
  it('seals the UI when the group is frozen (no Submit button, read-only editor)', async () => {
    api.get.mockResolvedValue({
      group: { ...group, frozen_at: '2026-08-25 03:41:25', merged_submission_id: 5 },
    });
    render(
      <MemoryRouter initialEntries={[`/group/${encodeId(1)}/edit`]}>
        <Routes>
          <Route path="/group/:groupId/edit" element={<GroupEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(editorProps).toHaveBeenCalled());
    expect(screen.queryByText('Submit Group')).toBeNull();
    expect(editorProps.mock.lastCall[0].editable).toBe(false);
  });

  it('opens the submit dialog without crashing when leader clicks Submit Group', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter initialEntries={[`/group/${encodeId(1)}/edit`]}>
        <Routes>
          <Route path="/group/:groupId/edit" element={<GroupEditor />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: /Submit Group/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Submit Group/i }));

    expect(screen.getByText(/SUBMISSION CEREMONY/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Anyway as Leader/i })).toBeInTheDocument();
    expect(screen.getAllByText('Sule').length).toBeGreaterThanOrEqual(1);
  });
});
