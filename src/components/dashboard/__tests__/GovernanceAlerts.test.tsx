import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GovernanceAlerts } from '../GovernanceAlerts';
import { useAuth } from '@/app/context/AuthContext';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('GovernanceAlerts Component', () => {
  const mockSession = { access_token: 'fake-token' };
  const mockPush = jest.fn();

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      session: mockSession,
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  it('renders loading state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });

    const { container } = render(<GovernanceAlerts />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('Failed'),
      isLoading: false,
    });

    render(<GovernanceAlerts />);
    expect(screen.getByText('Error loading alerts')).toBeInTheDocument();
  });

  it('renders tasks and handles click', () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Critical Task',
        description: 'Do this now',
        priority: 'CRITICAL',
        created_at: new Date().toISOString(),
        asset_id: 'asset-123',
        action_payload: { type: 'UPLOAD_PROOF', ghost_id: 'ghost-1' },
      },
      {
        id: '2',
        title: 'Low Task',
        description: 'Do this later',
        priority: 'LOW',
        created_at: new Date().toISOString(),
        asset_id: 'asset-456',
        action_payload: null,
      },
    ];

    (useSWR as jest.Mock).mockReturnValue({
      data: mockTasks,
      error: undefined,
      isLoading: false,
    });

    render(<GovernanceAlerts />);

    // Check count
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('alerts')).toBeInTheDocument();

    // Check task rendering
    expect(screen.getByText('Critical Task')).toBeInTheDocument();
    // Assuming the class check works (might need to be more specific or use toHaveClass)
    // The component uses template literals for classes based on priority
    // priority === 'CRITICAL' ? 'bg-red-100 text-red-600'
    const criticalBadge = screen.getByText('CRITICAL');
    expect(criticalBadge).toHaveClass('bg-red-100');
    expect(criticalBadge).toHaveClass('text-red-600');

    expect(screen.getByText('Low Task')).toBeInTheDocument();

    // Check click handler
    // We need to find the clickable container.
    // The text 'Critical Task' is inside a span inside a div inside the clickable div.
    // Let's find by text and traverse up or get closest div with onClick?
    // Testing library recommends firing event on the element.
    // The clickable element is the parent div of the content.
    // We can use closest('.group') as the class 'group' is on the clickable div.

    const criticalTaskContainer = screen.getByText('Critical Task').closest('.group');
    fireEvent.click(criticalTaskContainer!);

    expect(mockPush).toHaveBeenCalledWith('/airlock?asset_id=asset-123');

    // Click other task (should not navigate based on logic in component?)
    const lowTaskContainer = screen.getByText('Low Task').closest('.group');
    fireEvent.click(lowTaskContainer!);

    // Should NOT have navigated again with different params or at all if payload is null
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('renders empty state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: [],
      error: undefined,
      isLoading: false,
    });

    render(<GovernanceAlerts />);
    expect(screen.getByText('No overdue items detected.')).toBeInTheDocument();
  });
});
