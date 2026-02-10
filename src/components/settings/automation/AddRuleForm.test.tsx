import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddRuleForm } from './AddRuleForm';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

// Mock dependencies
jest.mock('@/app/context/AuthContext');
jest.mock('@/lib/supabase/client');

const mockUseAuth = useAuth as jest.Mock;
const mockCreateClient = createClient as jest.Mock;

describe('AddRuleForm', () => {
  const mockSupabase = {
    from: jest.fn(),
  };

  beforeEach(() => {
    mockCreateClient.mockReturnValue(mockSupabase);
    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-id' },
    });
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    // Mock assets fetch
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [
            { id: 'asset-1', name: 'Asset 1', currency: 'USD' },
            { id: 'asset-2', name: 'Asset 2', currency: 'EUR' },
          ],
          error: null,
        }),
      }),
    });

    render(<AddRuleForm onRuleAdded={jest.fn()} />);

    expect(screen.getByText('Add New Rule')).toBeInTheDocument();

    // Wait for assets to load
    await waitFor(() => {
      expect(screen.getByText('Asset 1 (USD)')).toBeInTheDocument();
    });
  });

  it('submits a new rule', async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'assets') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{ id: 'asset-1', name: 'Asset 1', currency: 'USD' }],
              error: null,
            }),
          }),
        };
      }
      if (table === 'categorization_rules') {
        return {
          insert: mockInsert,
        };
      }
      return {};
    });

    const onRuleAdded = jest.fn();
    render(<AddRuleForm onRuleAdded={onRuleAdded} />);

    // Wait for assets
    await waitFor(() => expect(screen.getByText('Asset 1 (USD)')).toBeInTheDocument());

    // Fill form
    fireEvent.change(screen.getByLabelText(/If description contains/i), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText(/Set Category to/i), { target: { value: 'asset-1' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Add Rule/i }));

    // Verify
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        trigger_pattern: 'Netflix',
        action_asset_id: 'asset-1',
      });
      expect(onRuleAdded).toHaveBeenCalled();
    });
  });
});
