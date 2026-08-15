import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Landing from './Landing';

// The landing components are the AI Studio export, kept byte-identical; its
// Join/Sign-in actions are wired by the Landing glue to the real auth routes.
function renderLanding() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<div>REGISTER PROBE</div>} />
        <Route path="/login" element={<div>LOGIN PROBE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Landing page (AI Studio public surface)', () => {
  it('renders exactly one h1 with the workspace-first pitch', () => {
    renderLanding();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('See the work behind the submission.');
  });

  it('tells the full workspace story in sections', () => {
    renderLanding();
    for (const name of [
      'How Draftly works',
      'One workspace. Two modes.',
      'Everything that happened, kept.',
      'Evidence on demand. Not surveillance.',
      'Your work speaks for itself.',
      'Free for early lecturers and their courses.',
    ]) {
      expect(
        screen.getByRole('heading', { level: 2, name })
      ).toBeInTheDocument();
    }
  });

  it('navigates the page through the three section anchors', () => {
    renderLanding();
    for (const [name, href] of [
      ['The Workspace', '#workspace'],
      ['How it Works', '#how-it-works'],
      ['Evidence', '#evidence'],
    ]) {
      const links = screen.getAllByRole('link', { name });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link.getAttribute('href')).toBe(href);
      }
    }
  });

  it('routes every Join the beta action to /register', () => {
    renderLanding();
    const beta = screen.getAllByRole('button', { name: /join the beta/i });
    expect(beta.length).toBeGreaterThan(2);
    fireEvent.click(beta[0]);
    expect(screen.getByText('REGISTER PROBE')).toBeInTheDocument();
  });

  it('routes sign-in actions to /login', () => {
    renderLanding();
    const signIn = screen.getAllByRole('button', { name: 'Sign in' });
    expect(signIn.length).toBeGreaterThan(1);
    fireEvent.click(signIn[0]);
    expect(screen.getByText('LOGIN PROBE')).toBeInTheDocument();
  });

  it('reveals the same actions from the mobile menu', () => {
    renderLanding();
    const before = screen.getAllByRole('button', { name: /join the beta/i }).length;
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(
      screen.getAllByRole('button', { name: /join the beta/i }).length
    ).toBe(before + 1);
  });

  it('opens the evidence inspector from the group contribution card', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: /view evidence/i }));
    expect(screen.getByText(/Provenance Record Verified/i)).toBeInTheDocument();
  });

  it('opens the privacy info modal from the footer', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: 'Privacy' }));
    expect(
      screen.getByRole('heading', { name: 'Privacy Policy' })
    ).toBeInTheDocument();
  });

  it('carries no third-party studio credit in the footer', () => {
    renderLanding();
    expect(screen.queryByText(/xpansieve/i)).not.toBeInTheDocument();
  });

  it('renders landmarks: header, main, footer, and a skip link', () => {
    renderLanding();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
  });
});
