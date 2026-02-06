import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionEditor } from '../TransactionEditor';
import { ExtractedData } from '@/lib/ai/types';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
}));

const mockData: { transactions: ExtractedData[] } = {
  transactions: [
    {
      date: '2023-10-25',
      amount: -5.50,
      currency: 'USD',
      description: 'Starbucks',
      confidence: 0.95
    }
  ]
};

describe('TransactionEditor', () => {
  it('renders initial transactions', () => {
    render(<TransactionEditor initialData={mockData} />);
    expect(screen.getByDisplayValue('Starbucks')).toBeInTheDocument();
    // input type number might show -5.5
    expect(screen.getByDisplayValue('-5.5')).toBeInTheDocument();
  });

  it('adds a split (new row)', () => {
    render(<TransactionEditor initialData={mockData} />);
    const addButton = screen.getByTestId('add-split-btn'); // Use the data-testid added in the component

    fireEvent.click(addButton);

    // Should have 2 rows now.
    // The initial one is Starbucks. The new one has empty description.
    const descriptions = screen.getAllByPlaceholderText('Description');
    expect(descriptions).toHaveLength(2);
  });

  it('removes a row', () => {
    render(<TransactionEditor initialData={mockData} />);

    // There is one remove button initially.
    const removeButtons = screen.getAllByRole('button', { name: /remove row/i });
    expect(removeButtons).toHaveLength(1);

    fireEvent.click(removeButtons[0]);

    const descriptions = screen.queryAllByPlaceholderText('Description');
    expect(descriptions).toHaveLength(0);
    expect(screen.getByText('No transactions found. Add a split to start.')).toBeInTheDocument();
  });

  it('updates input fields', () => {
    render(<TransactionEditor initialData={mockData} />);

    const amountInput = screen.getByLabelText('Amount');
    fireEvent.change(amountInput, { target: { value: '-10.00' } });

    expect(amountInput).toHaveValue(-10);
  });

});
