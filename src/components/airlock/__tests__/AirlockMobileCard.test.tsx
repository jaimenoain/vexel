import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  const mockOnApprove = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with data', () => {
    render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('YELLOW')).toBeInTheDocument();
  });

  it('disables Approve button when traffic_light is RED (Guardrail Check)', () => {
    const redItem = { ...mockItem, traffic_light: 'RED' as const };
    render(
      <AirlockMobileCard
        item={redItem}
        onClick={mockOnClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    // The button always has aria-label="Approve"
    const button = screen.getByRole('button', { name: 'Approve' });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed');
    expect(button).toHaveAttribute('title', 'Cannot approve items with RED status');

    fireEvent.click(button);
    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it('calls onApprove when clicking Approve on valid item (State Transition)', async () => {
    mockOnApprove.mockResolvedValue(undefined);

    render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    const button = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(button);

    expect(mockOnApprove).toHaveBeenCalledWith('123');
  });

  it('shows loading state during approval', async () => {
    let resolveApprove: () => void;
    const approvePromise = new Promise<void>((resolve) => {
      resolveApprove = resolve;
    });
    mockOnApprove.mockReturnValue(approvePromise);

    render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    const button = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(button);

    // Should be disabled while approving
    expect(button).toBeDisabled();

    // Resolve promise
    // @ts-ignore
    resolveApprove();

    await waitFor(() => expect(mockOnApprove).toHaveBeenCalled());
  });

  it('triggers exit animation and calls onRemove after delay (Visual Feedback)', async () => {
    jest.useFakeTimers();
    mockOnApprove.mockResolvedValue(undefined);

    const { container } = render(
      <AirlockMobileCard
        item={mockItem}
        onClick={mockOnClick}
        onApprove={mockOnApprove}
        onRemove={mockOnRemove}
      />
    );

    const button = screen.getByRole('button', { name: 'Approve' });
    fireEvent.click(button);

    await waitFor(() => expect(mockOnApprove).toHaveBeenCalled());

    // Check for exit animation class - wait for re-render
    const card = container.firstChild as HTMLElement;
    await waitFor(() => {
        expect(card).toHaveClass('opacity-0');
        expect(card).toHaveClass('translate-x-full');
    });

    // Fast-forward timer
    jest.advanceTimersByTime(300);

    expect(mockOnRemove).toHaveBeenCalledWith('123');
    jest.useRealTimers();
  });
});
