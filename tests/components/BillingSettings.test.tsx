import React from 'react';
import { render, screen } from '@testing-library/react';
import { BillingSettings } from '@/src/components/settings/BillingSettings';
import { useUsage } from '@/src/hooks/useUsage';

// Mock the hook
jest.mock('@/src/hooks/useUsage', () => ({
  useUsage: jest.fn(),
}));

describe('BillingSettings', () => {
  const mockUseUsage = useUsage as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseUsage.mockReturnValue({
      usage: null,
      isLoading: true,
      isError: null,
    });

    render(<BillingSettings />);
    expect(screen.getByText('Loading plan details...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseUsage.mockReturnValue({
      usage: null,
      isLoading: false,
      isError: true,
    });

    render(<BillingSettings />);
    expect(screen.getByText('Failed to load plan details.')).toBeInTheDocument();
  });

  it('renders usage correctly (under limit)', () => {
    mockUseUsage.mockReturnValue({
      usage: {
        current_count: 2,
        limit: 5,
        is_over_limit: false,
        plan_name: 'Free Tier',
      },
      isLoading: false,
      isError: null,
    });

    render(<BillingSettings />);
    expect(screen.getByText('Free Tier')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByText('You are tracking 2 of 5 assets included in your plan.')).toBeInTheDocument();
    expect(screen.getByText('Upgrade Plan')).toBeInTheDocument();
  });

  it('renders usage correctly (over limit)', () => {
    mockUseUsage.mockReturnValue({
      usage: {
        current_count: 6,
        limit: 5,
        is_over_limit: true,
        plan_name: 'Free Tier',
      },
      isLoading: false,
      isError: null,
    });

    render(<BillingSettings />);
    // Check for red text class presence
    const usageText = screen.getByText('6 / 5');
    expect(usageText).toHaveClass('text-red-600');
    expect(screen.getByText('You have exceeded your plan limits. Please upgrade to continue adding assets.')).toBeInTheDocument();
  });
});
