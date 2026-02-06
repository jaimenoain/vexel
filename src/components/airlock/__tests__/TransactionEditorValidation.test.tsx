import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionEditor } from '../TransactionEditor';
import '@testing-library/jest-dom';

// Mock SimpleToast to avoid timing issues in tests
jest.mock('@/src/components/common/SimpleToast', () => ({
  SimpleToast: ({ message }: { message: string }) => <div data-testid="simple-toast">{message}</div>,
}));

describe('TransactionEditor Validation', () => {
  const initialData = {
    transactions: [
      { amount: 100, date: '2023-01-01', description: 'Debit', confidence: 0.99 },
      { amount: -100, date: '2023-01-01', description: 'Credit', confidence: 0.99 }
    ]
  };

  it('renders Valid badge initially for balanced transactions', () => {
    render(<TransactionEditor initialData={initialData} confidence={0.99} />);
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('shows Error badge and toast when balance is broken', () => {
    render(<TransactionEditor initialData={initialData} confidence={0.99} />);

    // Find the first amount input and change it
    const inputs = screen.getAllByLabelText('Amount');
    fireEvent.change(inputs[0], { target: { value: '50' } });

    // Expect Error badge
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Expect Toast
    expect(screen.getByTestId('simple-toast')).toHaveTextContent('Credits and Debits do not match');
  });

  it('upgrades to Valid when user fixes the error', () => {
    render(<TransactionEditor initialData={initialData} confidence={0.99} />);

    const inputs = screen.getAllByLabelText('Amount');
    // Break it
    fireEvent.change(inputs[0], { target: { value: '50' } });
    expect(screen.getByText('Error')).toBeInTheDocument();

    // Fix it
    fireEvent.change(inputs[0], { target: { value: '100' } });
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('handles "Rule 3 Override": Low confidence but valid manual edit -> Green', () => {
     const lowConfidenceData = {
        transactions: [
          { amount: 100, date: '2023-01-01', description: 'Debit', confidence: 0.5 },
          { amount: -100, date: '2023-01-01', description: 'Credit', confidence: 0.5 }
        ]
     };

     // Initially it should be YELLOW because confidence passed is 0.5
     render(<TransactionEditor initialData={lowConfidenceData} confidence={0.5} />);
     expect(screen.getByText('Review Needed')).toBeInTheDocument();

     // Now edit it (change description, keeping math valid)
     const descInputs = screen.getAllByLabelText('Description');
     fireEvent.change(descInputs[0], { target: { value: 'Updated Description' } });

     // Should become Valid (GREEN) because isEdited=true overrides confidence
     expect(screen.getByText('Valid')).toBeInTheDocument();
  });
});
