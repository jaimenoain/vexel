import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AirlockMobileList } from '../AirlockMobileList';
import { AirlockItem } from '@/lib/types';

// Mock data
const mockItems: AirlockItem[] = [
  {
    id: '1',
    asset_id: 'asset-1',
    status: 'REVIEW_NEEDED',
    traffic_light: 'GREEN',
    confidence_score: 0.9,
    file_path: 'file1.pdf',
    created_at: '2023-01-01',
    ai_payload: {
      transactions: [{ description: 'Vendor A', amount: '100.00', date: '2023-01-01' }]
    }
  },
  {
    id: '2',
    asset_id: 'asset-1',
    status: 'REVIEW_NEEDED',
    traffic_light: 'YELLOW',
    confidence_score: 0.8,
    file_path: 'file2.pdf',
    created_at: '2023-01-02',
    ai_payload: {
      transactions: [{ description: 'Vendor B', amount: '200.00', date: '2023-01-02' }]
    }
  }
];

describe('AirlockMobileList', () => {
  const mockOnItemClick = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list of items', () => {
    render(
      <AirlockMobileList
        items={mockItems}
        onItemClick={mockOnItemClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Vendor A')).toBeInTheDocument();
    expect(screen.getByText('Vendor B')).toBeInTheDocument();
  });

  it('selects an item on click and shows action bar', () => {
    render(
      <AirlockMobileList
        items={mockItems}
        onItemClick={mockOnItemClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    const actionBar = screen.getByTestId('action-bar');

    // Initially hidden
    expect(actionBar).toHaveClass('translate-y-full');

    // Click first item
    fireEvent.click(screen.getByText('Vendor A'));

    // Action bar should appear
    expect(actionBar).toHaveClass('translate-y-0');
    expect(actionBar).not.toHaveClass('translate-y-full');
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked in action bar', async () => {
    mockOnApprove.mockResolvedValue(undefined);

    render(
      <AirlockMobileList
        items={mockItems}
        onItemClick={mockOnItemClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    // Select item
    fireEvent.click(screen.getByText('Vendor A'));

    // Click Approve
    const approveButton = screen.getByText('Approve').closest('button');
    if (!approveButton) throw new Error('Approve button not found');

    await act(async () => {
        fireEvent.click(approveButton);
    });

    expect(mockOnApprove).toHaveBeenCalledWith('1');
  });

  it('calls onItemClick when edit button is clicked', () => {
    render(
      <AirlockMobileList
        items={mockItems}
        onItemClick={mockOnItemClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    // Select item
    fireEvent.click(screen.getByText('Vendor A'));

    // Click Edit
    fireEvent.click(screen.getByText('Edit'));

    expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0]);
  });
});
