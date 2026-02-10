import React from 'react';
import { render, screen } from '@testing-library/react';
import { AirlockMobileCard } from '../AirlockMobileCard';
import { AirlockItem } from '@/lib/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Check: () => <div data-testid="icon-check" />,
  CircleHelp: () => <div data-testid="icon-circle-help" />,
  TriangleAlert: () => <div data-testid="icon-triangle-alert" />,
}));

// Mock data
const mockItem: AirlockItem = {
  id: '123',
  asset_id: 'asset-123',
  status: 'REVIEW_NEEDED',
  traffic_light: 'GREEN',
  confidence_score: 0.9,
  file_path: 'path/to/file',
  created_at: '2023-01-01',
  ai_payload: {
    transactions: [
      {
        description: 'Test Vendor',
        amount: '10.00',
        date: '2023-01-01',
      },
    ],
  },
};

describe('AirlockMobileCard Traffic Colors', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with GREEN status: specific hex color and Check icon', () => {
    const item = { ...mockItem, traffic_light: 'GREEN' as const };
    render(
      <AirlockMobileCard
        item={item}
        onClick={mockOnClick}
      />
    );

    const statusBadge = screen.getByTestId('status-indicator');
    expect(statusBadge).toHaveClass('bg-[#10893E]');
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders correctly with YELLOW status: specific hex color and CircleHelp icon', () => {
    const item = { ...mockItem, traffic_light: 'YELLOW' as const };
    render(
      <AirlockMobileCard
        item={item}
        onClick={mockOnClick}
      />
    );

    const statusBadge = screen.getByTestId('status-indicator');
    expect(statusBadge).toHaveClass('bg-[#F5A623]');
    expect(screen.getByTestId('icon-circle-help')).toBeInTheDocument();
  });

  it('renders correctly with RED status: specific hex color and TriangleAlert icon', () => {
    const item = { ...mockItem, traffic_light: 'RED' as const };
    render(
      <AirlockMobileCard
        item={item}
        onClick={mockOnClick}
      />
    );

    const statusBadge = screen.getByTestId('status-indicator');
    expect(statusBadge).toHaveClass('bg-[#D0021B]');
    expect(screen.getByTestId('icon-triangle-alert')).toBeInTheDocument();
  });
});
