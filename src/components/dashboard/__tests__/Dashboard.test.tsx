import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NetWorthHero } from '../NetWorthHero';
import { PendingActions } from '../PendingActions';
import { useAuth } from '@/app/context/AuthContext';
import useSWR from 'swr';

// Mock dependencies
jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Dashboard Components', () => {
  const mockSession = { access_token: 'fake-token' };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      session: mockSession,
    });
  });

  describe('NetWorthHero', () => {
    it('renders loading state (skeleton)', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      const { container } = render(<NetWorthHero />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders net worth correctly', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: { net_worth: 1234567.89 },
        error: undefined,
        isLoading: false,
      });

      render(<NetWorthHero />);

      // Check formatted value
      expect(screen.getByText('1,234,567.89')).toBeInTheDocument();

      // Check currency symbol is hidden by default
      const currencySymbol = screen.getByText('$');
      expect(currencySymbol).toHaveClass('hidden');
    });

    it('has hover and active classes for currency symbol', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: { net_worth: 1000 },
        error: undefined,
        isLoading: false,
      });

      render(<NetWorthHero />);

      const currencySymbol = screen.getByText('$');
      expect(currencySymbol).toHaveClass('hidden');
      expect(currencySymbol).toHaveClass('group-hover:inline');
    });

    it('handles error state', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: undefined,
        error: new Error('Failed'),
        isLoading: false,
      });

      render(<NetWorthHero />);
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
    });
  });

  describe('PendingActions', () => {
    it('renders loading state', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: undefined,
        error: undefined,
        isLoading: true,
      });

      const { container } = render(<PendingActions />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('calculates pending count correctly', () => {
      const mockItems = [
        { id: 1, status: 'REVIEW_NEEDED', traffic_light: 'GREEN' }, // Counted
        { id: 2, status: 'READY_TO_COMMIT', traffic_light: 'RED' }, // Counted
        { id: 3, status: 'READY_TO_COMMIT', traffic_light: 'YELLOW' }, // Counted
        { id: 4, status: 'READY_TO_COMMIT', traffic_light: 'GREEN' }, // Not counted
      ];

      (useSWR as jest.Mock).mockReturnValue({
        data: mockItems,
        error: undefined,
        isLoading: false,
      });

      render(<PendingActions />);

      // Filter logic: REVIEW_NEEDED OR RED OR YELLOW
      // Item 1: REVIEW_NEEDED -> Yes
      // Item 2: RED -> Yes
      // Item 3: YELLOW -> Yes
      // Item 4: GREEN, READY_TO_COMMIT -> No
      // Total 3

      // Find the count. It might be in a span.
      // Assuming the count is unique or context is clear
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('items')).toBeInTheDocument();
    });

    it('handles error state', () => {
      (useSWR as jest.Mock).mockReturnValue({
        data: undefined,
        error: new Error('Failed'),
        isLoading: false,
      });

      render(<PendingActions />);
      expect(screen.getByText('Error loading data')).toBeInTheDocument();
    });
  });
});
