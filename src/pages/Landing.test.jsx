import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

// The landing carries the Modern Atmospheric identity (light luminous sheet,
// Lora headlines, cobalt + electric cyan telemetry); the committed story
// order and copy are locked by the assertions below.
describe('Landing page (modern atmospheric)', () => {
  it('renders exactly one h1 with the workspace-first pitch', () => {
    renderLanding();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('See the work behind the submission.');
  });

  it('renders the private beta status badge in the hero', () => {
    renderLanding();
    expect(screen.getByText('Private Beta')).toBeInTheDocument();
  });

  it('explains the workflow before the telemetry (how it works)', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 2, name: 'How Draftly works' })
    ).toBeInTheDocument();
    for (const step of ['Create', 'Work', 'Submit', 'Review']) {
      expect(
        screen.getByRole('heading', { level: 3, name: step })
      ).toBeInTheDocument();
    }
  });

  it('shows both individual and group modes with equal weight', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Individual assignments' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Group assignments' })
    ).toBeInTheDocument();
  });

  it('speaks to students, not only lecturers', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your work has a history.' })
    ).toBeInTheDocument();
  });

  it('keeps the lecturer hook for the beta call to action', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Stop grading blind.' })
    ).toBeInTheDocument();
  });

  it('renders the integration bar with both workspace halves', () => {
    renderLanding();
    expect(screen.getByText('Works with')).toBeInTheDocument();
    expect(screen.getByText('Assignment workflow')).toBeInTheDocument();
  });

  it('exposes a scroll-spy navigation for the feature sections', () => {
    renderLanding();
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    const hrefs = within(nav).getAllByRole('link').map((link) => link.getAttribute('href'));
    for (const id of ['how', 'modes', 'record', 'evidence', 'students']) {
      expect(hrefs).toContain(`#${id}`);
    }
  });

  it('renders the masonry testimonial voices', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 2, name: 'What early users say.' })
    ).toBeInTheDocument();
    expect(screen.getByText('Course lead, Public Health')).toBeInTheDocument();
  });

  it('renders an accessible FAQ accordion that toggles on click', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Questions, answered.' })
    ).toBeInTheDocument();
    const button = screen.getByRole('button', {
      name: /what exactly does draftly record/i,
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'faq-panel-0');
    expect(screen.getByText(/every draft, revision, paste, and edit/i)).toBeInTheDocument();
  });

  it('routes every beta CTA to /register and every sign-in to /login', () => {
    renderLanding();
    const beta = screen.getAllByRole('link', { name: 'Join the beta' });
    const signIn = screen.getAllByRole('link', { name: 'Sign in' });
    expect(beta.length).toBeGreaterThan(1);
    expect(signIn.length).toBeGreaterThan(0);
    for (const link of beta) {
      expect(link.getAttribute('href')).toBe('/register');
    }
    for (const link of signIn) {
      expect(link.getAttribute('href')).toBe('/login');
    }
  });

  it('renders landmarks: header, main, footer, and a skip link', () => {
    renderLanding();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });

  it('keeps the privacy position in the footer', () => {
    renderLanding();
    expect(
      screen.getByText(/Evidence is recorded for the lecturer[’']s review, never for surveillance/i)
    ).toBeInTheDocument();
  });
});