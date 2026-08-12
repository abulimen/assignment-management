import { describe, it, expect } from 'vitest';
import { render, act } from '@testing-library/react';
import Playback from '../components/Playback';

// Regression: solo documents are now SECTIONED (doc > section > title+paragraph),
// so recorded step positions assume that structure. The replay editor must seed
// the same structure before applying steps, or every step is out of range and
// nothing renders (symptom: scrubber moves, text never appears).

const sectionedFinal = JSON.stringify({
  type: 'doc',
  content: [{
    type: 'section',
    attrs: { id: 'sec-replay' },
    content: [
      { type: 'sectionTitle' },
      { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
    ],
  }],
});

// Positions for doc > section > [sectionTitle, paragraph]:
// 4 = inside the paragraph. Typing 'h' then 'i'.
const events = [
  {
    type: 'step', data: {}, sequence: 1, occurred_at: 1000,
    steps: [{ stepType: 'replace', from: 4, to: 4, slice: { content: [{ type: 'text', text: 'h' }] } }],
    selection: { from: 5, to: 5 },
  },
  {
    type: 'step', data: {}, sequence: 2, occurred_at: 1001,
    steps: [{ stepType: 'replace', from: 5, to: 5, slice: { content: [{ type: 'text', text: 'i' }] } }],
    selection: { from: 6, to: 6 },
  },
];

const legacyFinal = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'legacy' }] }],
});

const legacyEvents = [
  {
    type: 'step', data: {}, sequence: 1, occurred_at: 1000,
    steps: [{ stepType: 'replace', from: 1, to: 1, slice: { content: [{ type: 'text', text: 'legacy' }] } }],
    selection: { from: 7, to: 7 },
  },
];

describe('Playback replay', () => {
  it('renders sectioned steps (replay seeds the sectioned structure)', async () => {
    let container;
    await act(async () => {
      const r = render(<Playback events={events} finalContent={sectionedFinal} />);
      container = r.container;
    });
    await act(async () => { await new Promise((res) => setTimeout(res, 50)); });
    expect(container.textContent).toContain('h');
  });

  it('still replays legacy flat documents', async () => {
    let container;
    await act(async () => {
      const r = render(<Playback events={legacyEvents} finalContent={legacyFinal} />);
      container = r.container;
    });
    await act(async () => { await new Promise((res) => setTimeout(res, 50)); });
    expect(container.textContent).toContain('legacy');
  });
});
