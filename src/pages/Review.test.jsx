import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { api } from '../api';
import Review from './Review';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('../api', () => ({ api: { get: vi.fn() } }));
vi.mock('../components/GroupFinalDoc', () => ({ default: () => <div>group-final-doc</div> }));

const hourly = Array.from({ length: 24 }, (_, h) => ({ h, n: 0 }));
const insights = {
  11: {
    summary: { typed_chars: 1200, pasted_chars: 0, sessions: 2, active_seconds: 900 },
    pastes: [],
    activity: { hourly, daily: [] },
  },
  12: {
    summary: { typed_chars: 800, pasted_chars: 0, sessions: 1, active_seconds: 600 },
    pastes: [],
    activity: { hourly, daily: [] },
  },
};

const sections = [
  { student_id: 11, submission_id: 101, student_name: 'Alice', title: 'Intro', word_count: 300, keystroke_count: 4000, total_time_ms: 3_000_000, paste_ratio: 0.1, surviving_chars: 900 },
  { student_id: 12, submission_id: 102, student_name: 'Bob', title: 'Body', word_count: 250, keystroke_count: 3000, total_time_ms: 2_000_000, paste_ratio: 0.05, surviving_chars: 700 },
];

const groupPlayback = {
  id: 9,
  content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
  realtime: true,
  sections,
  insights,
};

const individualPlayback = {
  id: 1,
  content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
  events: [
    { type: 'keystroke', occurred_at: 100, steps: [{ from: 0, to: 0, insert: 'Hello' }] },
  ],
  stats: { word_count: 100 },
};

function renderReview() {
  return render(
    <MemoryRouter initialEntries={['/review/9']}>
      <Routes>
        <Route path="/review/:id" element={<Review />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Review (individual)', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((path) =>
      path.endsWith('/playback') ? Promise.resolve(individualPlayback) : Promise.resolve({}),
    );
  });

  it('renders document-first view with factual submission record and mode toggling', async () => {
    renderReview();
    expect(await screen.findByText('Submission Review')).toBeInTheDocument();

    // Mode buttons in top bar
    expect(screen.getByRole('button', { name: /^document view$/i })).toBeInTheDocument();
    const processBtn = screen.getByRole('button', { name: /^process record$/i });
    expect(processBtn).toBeInTheDocument();

    // Right sidebar displays factual submission record
    expect(screen.getByText('Submission Record')).toBeInTheDocument();
    expect(screen.getByText('Process Summary')).toBeInTheDocument();

    // Toggle into Process Record mode
    fireEvent.click(processBtn);
    expect(await screen.findByText('Process Timeline')).toBeInTheDocument();
  });
});

describe('Review (group)', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((path) =>
      path.endsWith('/playback') ? Promise.resolve(groupPlayback) : Promise.resolve({}),
    );
  });

  it('renders group document and member contributions in sidebars and canvas', async () => {
    renderReview();
    expect(await screen.findByText('Submission Review')).toBeInTheDocument();

    // Group final doc rendered in center
    expect(await screen.findByText('group-final-doc')).toBeInTheDocument();

    // Member contributions rendered in sidebar
    expect(await screen.findByRole('heading', { name: /member contributions/i })).toBeInTheDocument();
    expect(screen.getByText('Member workload')).toBeInTheDocument();
  });
});
