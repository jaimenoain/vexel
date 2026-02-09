import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PlanLimitBanner } from '../PlanLimitBanner';
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

describe('PlanLimitBanner Component', () => {
  const mockSession = { access_token: 'fake-token' };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      session: mockSession,
    });
  });

  it('renders nothing when loading', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });

    const { container } = render(<PlanLimitBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is an error', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('Failed'),
      isLoading: false,
    });

    const { container } = render(<PlanLimitBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when not over limit', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: {
        current_count: 2,
        limit: 5,
        is_over_limit: false,
      },
      error: undefined,
      isLoading: false,
    });

    const { container } = render(<PlanLimitBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders banner when over limit', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: {
        current_count: 6,
        limit: 5,
        is_over_limit: true,
      },
      error: undefined,
      isLoading: false,
    });

    render(<PlanLimitBanner />);

    expect(screen.getByText(/Plan Limit Exceeded/i)).toBeInTheDocument();
    expect(screen.getByText(/6 of 5 free assets/i)).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
    expect(screen.getByText('Upgrade').closest('a')).toHaveAttribute('href', '#');
  });
});
