import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PortfolioPage from '@/app/portfolio/page';

// Mock swr
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock useAuth
jest.mock('@/app/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock Shell to avoid complex layout rendering
jest.mock('@/src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';

describe('PortfolioPage', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ session: { access_token: 'fake-token' } });
  });

  it('renders loading state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });

    render(<PortfolioPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: false,
    });

    render(<PortfolioPage />);
    expect(screen.getByText('Error loading portfolio')).toBeInTheDocument();
  });

  it('renders entities and handles accordion toggle', () => {
    const mockEntities = [
      {
        id: 'entity-1',
        name: 'Entity One',
        type: 'FAMILY',
        assets: [
          { id: 'asset-1', name: 'Asset One', type: 'BANK', currency: 'USD', net_worth: 100 },
        ],
      },
    ];

    (useSWR as jest.Mock).mockReturnValue({
      data: mockEntities,
      error: undefined,
      isLoading: false,
    });

    render(<PortfolioPage />);

    // Check Entity Name
    expect(screen.getByText('Entity One')).toBeInTheDocument();

    // Check Asset is NOT visible initially (Accordion closed)
    expect(screen.queryByText('Asset One')).not.toBeInTheDocument();

    // Click accordion button
    const button = screen.getByTestId('entity-accordion-button');
    fireEvent.click(button);

    // Check Asset IS visible now
    expect(screen.getByText('Asset One')).toBeInTheDocument();
  });
});
