import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicy from './PrivacyPolicy';
import TermsOfService from './TermsOfService';
import CookiePolicy from './CookiePolicy';
import { CookieNotice } from '../components/CookieNotice';

describe('Legal Pages (NDPA / NDPR Aligned)', () => {
  it('renders the Privacy Policy page with NDPA 2023 references and required headings', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <PrivacyPolicy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Privacy & Data Protection Policy/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Nigeria Data Protection Act/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Nigeria Data Protection Commission/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: /Statutory Framework & Scope/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Categories of Personal Data/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Your Rights as a Data Subject/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Product Philosophy & The Draftly Privacy Pledge/i })).toBeInTheDocument();
    expect(screen.getAllByText(/dpo@draftly.ng/i).length).toBeGreaterThan(0);
  });

  it('renders the Terms of Service page with student copyright ownership and academic integrity terms', () => {
    render(
      <MemoryRouter initialEntries={['/terms']}>
        <TermsOfService />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Terms of Service/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Student Intellectual Property/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Evidence on Demand/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Governing Law/i })).toBeInTheDocument();
    expect(screen.getByText(/Laws of the Federal Republic of Nigeria/i)).toBeInTheDocument();
  });

  it('renders the Cookie Policy page with storage inventory and offline resilience details', () => {
    render(
      <MemoryRouter initialEntries={['/cookies']}>
        <CookiePolicy />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: /Cookie & Storage Policy/i })).toBeInTheDocument();
    expect(screen.getByText(/draftly_token/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Detailed Inventory of Storage Items/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Zero Third-Party Advertising Cookies/i })).toBeInTheDocument();
  });
});

describe('CookieNotice Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('displays the cookie notice banner when no consent is stored in localStorage', () => {
    render(
      <MemoryRouter>
        <CookieNotice />
      </MemoryRouter>
    );

    // Initial render is hidden before timer
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Fast-forward timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Privacy & Workspace Storage/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Essential only' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn more' })).toHaveAttribute('href', '/cookies');
  });

  it('persists consent and hides when Accept is clicked', () => {
    render(
      <MemoryRouter>
        <CookieNotice />
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(localStorage.getItem('draftly_cookie_consent')).toBe('all');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render if consent has already been recorded', () => {
    localStorage.setItem('draftly_cookie_consent', 'essential');
    render(
      <MemoryRouter>
        <CookieNotice />
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
