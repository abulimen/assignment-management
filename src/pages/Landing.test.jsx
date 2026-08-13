import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>
  );
}

describe('Landing page (marketing root)', () => {
  it('renders exactly one h1 with the primary pitch', () => {
    renderLanding();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('See the work behind the grade.');
    expect(screen.getByText('See the work behind the grade.')).toBeInTheDocument();
  });

  it('shows both individual and group modes', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Individual assignments' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Group assignments' })).toBeInTheDocument();
  });

  it('makes both CTAs point at /register and /login', () => {
    renderLanding();
    const getStarted = screen.getAllByRole('link', { name: 'Get started' });
    const signIn = screen.getAllByRole('link', { name: 'Sign in' });
    expect(getStarted.length).toBeGreaterThan(0);
    expect(signIn.length).toBeGreaterThan(0);
    for (const link of getStarted) {
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