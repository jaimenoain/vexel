import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NetWorthHero } from '../NetWorthHero';
import { useAuth } from '@/app/context/AuthContext';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/formatting';

jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@/lib/formatting', () => ({
  formatCurrency: jest.fn(),
}));

describe('NetWorthHero', () => {
  const mockSession = { access_token: 'fake-token' };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      session: mockSession,
    });
    (useTranslation as jest.Mock).mockReturnValue({
      t: (key: string) => key === 'dashboard.net_worth' ? 'Net Worth Translated' : key,
      i18n: {
        language: 'en',
      },
    });
    (formatCurrency as jest.Mock).mockReturnValue('$1,000.00');
  });

  it('renders loading state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      isLoading: true,
    });
    const { container } = render(<NetWorthHero />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      error: new Error('Failed'),
    });
    render(<NetWorthHero />);
    expect(screen.getByText('Error loading data')).toBeInTheDocument();
    expect(screen.getByText('Net Worth Translated')).toBeInTheDocument();
  });

  it('renders net worth with correct formatting', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: { net_worth: 1000 },
      isLoading: false,
    });

    render(<NetWorthHero />);

    expect(screen.getByText('Net Worth Translated')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();

    expect(formatCurrency).toHaveBeenCalledWith(1000, 'USD', 'en');
  });
});
