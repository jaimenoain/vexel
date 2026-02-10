import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RulesList } from './RulesList';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/app/context/AuthContext');
jest.mock('@/lib/supabase/client');

const mockUseAuth = useAuth as jest.Mock;
const mockCreateClient = createClient as jest.Mock;

describe('RulesList', () => {
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

  it('renders rules correctly', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'rule-1',
                trigger_pattern: 'Netflix',
                asset: { name: 'Subscriptions', currency: 'USD' },
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    render(<RulesList refreshTrigger={0} />);

    await waitFor(() => {
      expect(screen.getByText('Netflix')).toBeInTheDocument();
      expect(screen.getByText('Subscriptions (USD)')).toBeInTheDocument();
    });
  });

  it('handles delete', async () => {
    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'categorization_rules') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'rule-1',
                    trigger_pattern: 'Netflix',
                    asset: { name: 'Subscriptions', currency: 'USD' },
                  },
                ],
                error: null,
              }),
            }),
          }),
          delete: mockDelete,
        };
      }
      return {};
    });

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);

    render(<RulesList refreshTrigger={0} />);

    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument());

    const deleteButton = screen.getByRole('button', { name: /Delete rule/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(screen.queryByText('Netflix')).not.toBeInTheDocument();
    });
  });
});
