import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { ToastProvider } from '../context/ToastContext';
import Profile from './Profile';

vi.mock('../api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

function renderProfile() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student profile details and allows editing personal details', async () => {
    useAuth.mockReturnValue({
      user: { id: 1, name: 'Ada Lovelace', role: 'student', email: 'ada@uni.edu' },
      setUser: vi.fn(),
    });

    api.get.mockResolvedValue({
      user: {
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@uni.edu',
        role: 'student',
        studentId: '24/001',
        emailVerified: true,
        createdAt: '2026-08-01T00:00:00Z',
        stats: {
          courses: 3,
          activities: 5,
        },
      },
    });

    api.put.mockResolvedValue({
      user: {
        id: 1,
        name: 'Ada King Lovelace',
        email: 'ada@uni.edu',
        role: 'student',
        studentId: '24/001',
      },
    });

    renderProfile();

    // Wait for data to load past skeleton
    await waitFor(() => {
      expect(screen.getByText('Personal Details')).toBeInTheDocument();
    });

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('student')).toBeInTheDocument();
    expect(screen.getByText('Verified Account')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Test form submission for name update
    const nameInput = screen.getByPlaceholderText('Your full name');
    fireEvent.change(nameInput, { target: { value: 'Ada King Lovelace' } });

    const saveButton = screen.getByRole('button', { name: /save details/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('me', {
        name: 'Ada King Lovelace',
        studentId: '24/001',
      });
    });
  });

  it('handles password change submission and validation', async () => {
    useAuth.mockReturnValue({
      user: { id: 2, name: 'Alan Turing', role: 'lecturer', email: 'alan@uni.edu' },
      setUser: vi.fn(),
    });

    api.get.mockResolvedValue({
      user: {
        id: 2,
        name: 'Alan Turing',
        email: 'alan@uni.edu',
        role: 'lecturer',
        emailVerified: true,
        stats: { courses: 2, activities: 4 },
      },
    });

    api.put.mockResolvedValue({ message: 'Profile updated successfully' });

    renderProfile();

    await waitFor(() => {
      expect(screen.getByText('Security & Password')).toBeInTheDocument();
    });

    const currentPassInput = screen.getByPlaceholderText('••••••••');
    const newPassInput = screen.getByPlaceholderText('Min 8 characters');
    const confirmPassInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(currentPassInput, { target: { value: 'oldPassword123' } });
    fireEvent.change(newPassInput, { target: { value: 'newSecurePassword456' } });
    fireEvent.change(confirmPassInput, { target: { value: 'newSecurePassword456' } });

    const changePassButton = screen.getByRole('button', { name: /change password/i });
    fireEvent.click(changePassButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('me', {
        currentPassword: 'oldPassword123',
        newPassword: 'newSecurePassword456',
      });
    });
  });
});
