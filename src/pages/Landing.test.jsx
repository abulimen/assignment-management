import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Landing from './Landing';

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

describe('Landing page (Redesigned Assignment Workspace Surface)', () => {
  it('renders exactly one h1 with the workspace-first pitch', () => {
    renderLanding();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('The workspace for student assignments.');
  });

  it('tells the full workspace story in sections', () => {
    renderLanding();
    for (const name of [
      "The assignment shouldn't disappear into a file upload.",
      'Built for individual and group assignments.',
      'One workspace. From first draft to submission.',
      'The final submission comes with its history.',
      'A clearer workflow for everyone involved.',
      'Try Draftly with one real assignment.',
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

  it('opens the work history inspector from the submission card', () => {
    renderLanding();
    fireEvent.click(screen.getByRole('button', { name: /view work history/i }));
    expect(screen.getByText(/Provenance Record Verified/i)).toBeInTheDocument();
  });

  it('renders links to Privacy, Terms, and Cookie legal pages in the footer', () => {
    renderLanding();
    const privacyLink = screen.getByRole('link', { name: 'Privacy' });
    const termsLink = screen.getByRole('link', { name: 'Terms' });
    const cookiesLink = screen.getByRole('link', { name: 'Cookies' });

    expect(privacyLink).toHaveAttribute('href', '/privacy');
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(cookiesLink).toHaveAttribute('href', '/cookies');
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
