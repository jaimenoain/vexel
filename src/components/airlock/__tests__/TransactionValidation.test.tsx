import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionEditor } from '../TransactionEditor';
import '@testing-library/jest-dom';

// Mock SimpleToast
jest.mock('@/src/components/common/SimpleToast', () => ({
  SimpleToast: ({ message }: { message: string }) => <div data-testid="simple-toast">{message}</div>,
}));

// Mock Lucide icons to avoid issues
jest.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Trash2: () => <span>Trash</span>,
  CheckCircle: () => <span>IconCheck</span>,
  AlertTriangle: () => <span>IconWarn</span>,
  AlertCircle: () => <span>IconError</span>,
}));

describe('QA Review: Traffic Light Protocol', () => {
  const initialData = {
    transactions: [
      { amount: 100, date: '2023-01-01', description: 'Debit', confidence: 0.99 },
      { amount: -100, date: '2023-01-01', description: 'Credit', confidence: 0.99 }
    ]
  };

  it('1 & 2 & 3. Immediate Feedback, Visual Cue (Shake), and Notification', () => {
    const { container } = render(<TransactionEditor initialData={initialData} confidence={0.99} />);

    // Initial state: Valid
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('shake');

    // Action: Create imbalance (Credits != Debits)
    const inputs = screen.getAllByLabelText('Amount');
    fireEvent.change(inputs[0], { target: { value: '50' } });

    // 1. Immediate Feedback: Traffic Light updates to RED
    expect(screen.getByText('Error')).toBeInTheDocument();

    // 2. Visual Cue: Shake animation triggers
    // The component applies 'shake' class to the root div
    expect(container.firstChild).toHaveClass('shake');

    // 3. Notification: Toast appears
    expect(screen.getByTestId('simple-toast')).toHaveTextContent('Credits and Debits do not match');
  });

  it('4. Recovery: Correcting numbers switches badge back to GREEN', () => {
    const { container } = render(<TransactionEditor initialData={initialData} confidence={0.99} />);

    // Break balance
    const inputs = screen.getAllByLabelText('Amount');
    fireEvent.change(inputs[0], { target: { value: '50' } });
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('shake');

    // Recover: Fix balance
    fireEvent.change(inputs[0], { target: { value: '100' } });

    // Assert GREEN
    expect(screen.getByText('Valid')).toBeInTheDocument();

    // Assert Shake removed
    expect(container.firstChild).not.toHaveClass('shake');
  });

  it('5. Edge Case: Clearing a Date field triggers non-Green state', () => {
     render(<TransactionEditor initialData={initialData} confidence={0.99} />);

     // Clear Date
     const dateInputs = screen.getAllByLabelText('Date');
     fireEvent.change(dateInputs[0], { target: { value: '' } });

     // Expect Error (Red) or Review Needed (Yellow).
     // Based on code, missing date returns RED.
     expect(screen.getByText('Error')).toBeInTheDocument();

     // Optional: Check specific error message if applicable
     expect(screen.getByTestId('simple-toast')).toHaveTextContent('One or more transactions have missing or invalid dates');
  });
});
