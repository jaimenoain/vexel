import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from '../page';
import { useAuth } from '@/app/context/AuthContext';
import { useVexelContext } from '@/app/context/VexelContext';

// Mock dependencies
jest.mock('@/app/context/AuthContext');
jest.mock('@/app/context/VexelContext');
jest.mock('@/src/components/marketing/LandingPage', () => {
  return function DummyLandingPage() {
    return <div data-testid="landing-page">Landing Page</div>;
  };
});
jest.mock('@/src/components/layout/Shell', () => {
  return {
    Shell: function DummyShell({ children }: { children: React.ReactNode }) {
      return <div data-testid="dashboard-shell">{children}</div>;
    },
  };
});
jest.mock('@/src/components/dashboard/DashboardPage', () => {
  return {
    DashboardPage: function DummyDashboardPage() {
      return <div data-testid="dashboard-page">Dashboard Page</div>;
    },
  };
});

describe('Home Routing', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseVexelContext = useVexelContext as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation for VexelContext to avoid errors if not set
    mockUseVexelContext.mockReturnValue({
      selectedScope: { type: 'GLOBAL' },
    });
  });

  test('Case 1 (Loading): renders nothing when loading is true', () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      user: null,
    });

    const { container } = render(<Home />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('Case 2 (Unauthenticated): renders LandingPage when user is null', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: null,
    });

    render(<Home />);

    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-shell')).not.toBeInTheDocument();
  });

  test('Case 3 (Authenticated): renders Shell when user is present', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: '1' },
    });

    render(<Home />);

    expect(screen.getByTestId('dashboard-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    // Also check that DashboardPage is rendered inside Shell for GLOBAL scope
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });
});
