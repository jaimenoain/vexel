
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { useAuth } from '@/app/context/AuthContext';
import { useVexelContext } from '@/app/context/VexelContext';

// Mock dependencies
jest.mock('@/app/context/AuthContext');
jest.mock('@/app/context/VexelContext');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
// Mock useSWR globally
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    data: undefined,
    error: undefined,
    isLoading: false,
  })),
}));

// Mock child components to simplify testing
jest.mock('@/src/components/dashboard/NetWorthHero', () => ({
  NetWorthHero: () => <div data-testid="net-worth-hero">Net Worth Hero</div>,
}));
jest.mock('@/src/components/dashboard/PendingActions', () => ({
  PendingActions: () => <div data-testid="pending-actions">Pending Actions</div>,
}));
jest.mock('@/src/components/dashboard/GovernanceAlerts', () => ({
  GovernanceAlerts: () => <div data-testid="governance-alerts">Governance Alerts</div>,
}));
// Mock Shell because it has complex structure (Sidebar etc)
jest.mock('@/src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

// Mock LandingPage
jest.mock('@/src/components/marketing/LandingPage', () => ({
  __esModule: true,
  default: () => <div data-testid="landing-page">Landing Page</div>,
}));


describe('Home Page Logic', () => {
  const mockUseAuth = useAuth as jest.Mock;
  const mockUseVexelContext = useVexelContext as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when loading', () => {
    mockUseAuth.mockReturnValue({ loading: true, user: null });
    mockUseVexelContext.mockReturnValue({ selectedScope: { type: 'GLOBAL' } });

    const { container } = render(<Home />);
    // Check for spinner class or structure
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders LandingPage when not authenticated', () => {
    mockUseAuth.mockReturnValue({ loading: false, user: null });
    mockUseVexelContext.mockReturnValue({ selectedScope: { type: 'GLOBAL' } });

    render(<Home />);
    expect(screen.getByTestId('landing-page')).toBeInTheDocument();
  });

  it('renders DashboardPage inside Shell when authenticated and GLOBAL scope', () => {
    mockUseAuth.mockReturnValue({ loading: false, user: { id: '123' } });
    mockUseVexelContext.mockReturnValue({ selectedScope: { type: 'GLOBAL' } });

    render(<Home />);

    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.getByTestId('net-worth-hero')).toBeInTheDocument();
    expect(screen.getByTestId('pending-actions')).toBeInTheDocument();
    expect(screen.getByTestId('governance-alerts')).toBeInTheDocument();
  });

  it('renders scope message when authenticated and not GLOBAL scope', () => {
    mockUseAuth.mockReturnValue({ loading: false, user: { id: '123' } });
    mockUseVexelContext.mockReturnValue({ selectedScope: { type: 'ENTITY', name: 'My Entity' } });

    render(<Home />);

    expect(screen.getByTestId('shell')).toBeInTheDocument();
    expect(screen.queryByTestId('net-worth-hero')).not.toBeInTheDocument();
    expect(screen.getByText('My Entity')).toBeInTheDocument();
    expect(screen.getByText(/Select "Global Position" to view the Cockpit/)).toBeInTheDocument();
  });
});
