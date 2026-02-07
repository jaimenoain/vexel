import { matchGhostEntries } from '../matching-service';
import { supabaseAdmin } from '../../supabase-admin';

// Mock supabaseAdmin
jest.mock('../../supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('matchGhostEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 0 matches if transaction not found', async () => {
    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
    });

    const result = await matchGhostEntries('txn-missing');
    expect(result.matchedCount).toBe(0);
    expect(result.errors[0]).toContain('Transaction not found');
  });

  it('should match a pending ghost entry exactly', async () => {
    const txn = {
      id: 'txn-123',
      date: '2023-01-01',
      ledger_lines: [
        { id: 'line-1', asset_id: 'asset-A', amount: 100 }
      ]
    };

    const ghost = {
      id: 'ghost-1',
      asset_id: 'asset-A',
      expected_amount: 100,
      expected_date: '2023-01-01',
      status: 'PENDING'
    };

    // Mock setup
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ledger_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: txn, error: null })
        };
      }
      if (table === 'ghost_entries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [ghost], error: null }),
          update: updateMock
        };
      }
      return {};
    });

    const result = await matchGhostEntries('txn-123');

    expect(result.matchedCount).toBe(1);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'MATCHED',
      transaction_id: 'txn-123'
    }));
    expect(updateEqMock).toHaveBeenCalledWith('id', 'ghost-1');
  });

  it('should filter out ghosts with amount mismatch > 5%', async () => {
    const txn = {
      id: 'txn-123',
      date: '2023-01-01',
      ledger_lines: [{ id: 'line-1', asset_id: 'asset-A', amount: 100 }]
    };

    const ghostMismatch = {
      id: 'ghost-bad',
      asset_id: 'asset-A',
      expected_amount: 106, // > 5% diff
      expected_date: '2023-01-01',
      status: 'PENDING'
    };

    const ghostMatch = {
      id: 'ghost-good',
      asset_id: 'asset-A',
      expected_amount: 105, // 5% diff (boundary)
      expected_date: '2023-01-01',
      status: 'PENDING'
    };

    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ledger_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: txn, error: null })
        };
      }
      if (table === 'ghost_entries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [ghostMismatch, ghostMatch], error: null }),
          update: updateMock
        };
      }
      return {};
    });

    const result = await matchGhostEntries('txn-123');

    expect(result.matchedCount).toBe(1);
    expect(updateEqMock).toHaveBeenCalledWith('id', 'ghost-good');
    expect(updateEqMock).not.toHaveBeenCalledWith('id', 'ghost-bad');
  });

  it('should resolve conflicts by closest date', async () => {
    const txn = {
      id: 'txn-123',
      date: '2023-01-10',
      ledger_lines: [{ id: 'line-1', asset_id: 'asset-A', amount: 100 }]
    };

    const ghostA = {
        id: 'ghost-A',
        expected_amount: 100,
        expected_date: '2023-01-08', // Diff 2 days
        status: 'PENDING'
    };

    const ghostB = {
        id: 'ghost-B',
        expected_amount: 100,
        expected_date: '2023-01-11', // Diff 1 day
        status: 'PENDING'
    };

    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ledger_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: txn, error: null })
        };
      }
      if (table === 'ghost_entries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [ghostA, ghostB], error: null }),
          update: updateMock
        };
      }
      return {};
    });

    const result = await matchGhostEntries('txn-123');

    expect(result.matchedCount).toBe(1);
    expect(updateEqMock).toHaveBeenCalledWith('id', 'ghost-B'); // Closest
  });
});
