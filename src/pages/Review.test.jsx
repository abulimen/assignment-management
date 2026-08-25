import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { api } from '../api';
import { encodeId } from '../utils/id';
import Review from './Review';

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

vi.mock('../api', () => ({ api: { get: vi.fn() } }));

// Capture GroupFinalDoc props: the sealed group document must actually reach
// the component (content + sections), or the review canvas renders empty.
const groupFinalDocProps = vi.fn();
vi.mock('../components/GroupFinalDoc', () => ({
  default: (props) => {
    groupFinalDocProps(props);
    return <div>group-final-doc</div>;
  },
}));

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

function renderReview(reviewId = encodeId(9)) {
  return render(
    <MemoryRouter initialEntries={[`/review/${reviewId}`]}>
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
    const replayBtn = screen.getByRole('button', { name: /^process record$/i });
    expect(replayBtn).toBeInTheDocument();

    // Right sidebar displays factual submission record under Overview tab by default
    expect(screen.getByText('Submission Record')).toBeInTheDocument();
    expect(screen.getByText('Process Summary')).toBeInTheDocument();

    // Sidebar navigation tabs
    const timelineTab = screen.getByRole('button', { name: /^timeline$/i });
    const patternTab = screen.getByRole('button', { name: /^pattern$/i });
    const sourcesTab = screen.getByRole('button', { name: /^sources$/i });

    expect(timelineTab).toBeInTheDocument();
    expect(patternTab).toBeInTheDocument();
    expect(sourcesTab).toBeInTheDocument();

    // Switch to Timeline tab while staying in Document view
    fireEvent.click(timelineTab);
    expect(await screen.findByText('Process Timeline')).toBeInTheDocument();

    // Switch to Pattern tab
    fireEvent.click(patternTab);
    expect(await screen.findByText('Writing Pattern')).toBeInTheDocument();
  });

  it('renders 404 for raw unencoded numeric id like /review/1', async () => {
    renderReview('1');
    expect(await screen.findByText('404')).toBeInTheDocument();
    expect(screen.getByText('Uncharted Document Coordinates')).toBeInTheDocument();
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
    expect(await screen.findByText('group-final-doc')).toBeInTheDocument();

    // Sidebars display group breakdown
    expect(screen.getByText('Submission Record')).toBeInTheDocument();
    expect(screen.getByText('Member Contributions')).toBeInTheDocument();
  });

  // Regression: GroupFinalDoc was rendered without content/sections, so the
  // sealed snapshot never reached the canvas (blank page, 0 words, no authors).
  it('hands the sealed snapshot content and member sections to GroupFinalDoc', async () => {
    renderReview();
    expect(await screen.findByText('group-final-doc')).toBeInTheDocument();
    expect(groupFinalDocProps).toHaveBeenCalled();
    const props = groupFinalDocProps.mock.lastCall[0];
    expect(props.content).toBe(groupPlayback.content);
    expect(props.sections).toEqual(groupPlayback.sections);
  });
});
