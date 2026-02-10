import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AirlockMobileCard } from '../AirlockMobileCard';
import { AirlockItem } from '@/lib/types';

const mockItem: AirlockItem = {
  id: '123',
  asset_id: 'asset-123',
  status: 'REVIEW_NEEDED',
  traffic_light: 'YELLOW',
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

describe('AirlockMobileCard', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with data', () => {
    render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
      />
    );

    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
  });

  it('applies selected styles when isSelected is true', () => {
    const { container } = render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        isSelected={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('border-black');
    expect(card).toHaveClass('ring-1');
    expect(card).toHaveClass('ring-black');
  });

  it('applies exiting styles when isExiting is true', () => {
    const { container } = render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        isExiting={true}
      />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('opacity-0');
    expect(card).toHaveClass('translate-x-full');
  });

  it('calls onClick when clicked', () => {
    render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
      />
    );

    fireEvent.click(screen.getByText('Test Vendor'));
    expect(mockOnClick).toHaveBeenCalled();
  });
});
