import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionEditor } from '../TransactionEditor';

describe('TransactionEditor onChange', () => {
  it('calls onChange when input is modified', async () => {
    const handleChange = jest.fn();
    const initialData = {
      transactions: [
        {
          date: '2023-01-01',
          description: 'Test Vendor',
          amount: 100,
          currency: 'USD',
          confidence: 0.9,
        },
      ],
    };

    render(<TransactionEditor initialData={initialData} onChange={handleChange} />);

    // Initial render should call onChange with initial rows
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ description: 'Test Vendor', amount: 100 })
    ]));

    // Update description
    const descInput = screen.getByDisplayValue('Test Vendor');
    fireEvent.change(descInput, { target: { value: 'New Vendor' } });

    // Expect onChange to be called again with updated data
    await waitFor(() => {
        expect(handleChange).toHaveBeenLastCalledWith(expect.arrayContaining([
            expect.objectContaining({ description: 'New Vendor' })
        ]));
    });
  });
});
