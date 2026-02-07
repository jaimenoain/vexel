import { matchGhostEntries } from '../matching-service';
import { supabaseAdmin } from '../../supabase-admin';

// Mock supabaseAdmin
jest.mock('../../supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

describe('Ghostbuster QA Tests', () => {
  const mockTxn = (amount: number, date: string) => ({
    id: 'txn-1',
    date: date,
    ledger_lines: [
      { id: 'line-1', asset_id: 'asset-A', amount: amount, type: 'DEBIT' }
    ]
  });

  const mockGhost = (id: string, amount: number, date: string, status: string = 'PENDING') => ({
    id,
    asset_id: 'asset-A',
    expected_amount: amount,
    expected_date: date,
    status
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to setup mocks
  const setupMocks = (transaction: any, ghosts: any[]) => {
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ledger_transactions') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: transaction, error: null })
        };
      }
      if (table === 'ghost_entries') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: ghosts, error: null }),
          update: updateMock
        };
      }
      return {};
    });

    return { updateEqMock };
  };

  test('Scenario 1: Rent Payment - Exact match', async () => {
    // Rent Ghost: $1000, 1st of month
    // Transaction: $1000, 1st of month
    const txn = mockTxn(1000, '2023-01-01');
    const ghost = mockGhost('ghost-rent', 1000, '2023-01-01');

    const { updateEqMock } = setupMocks(txn, [ghost]);

    const result = await matchGhostEntries('txn-1');

    expect(result.matchedCount).toBe(1);
    expect(updateEqMock).toHaveBeenCalledWith('id', 'ghost-rent');
  });

  test('Scenario 2: Tolerance (Amount) - +/- 5%', async () => {
    // Ghost: $1000
    // Transaction 1: $950 (5% diff) -> Match
    // Transaction 2: $1050 (5% diff) -> Match
    // Transaction 3: $949 (>5% diff) -> No Match

    const ghost = mockGhost('ghost-tol', 1000, '2023-01-01');

    // Case 1: $950
    let txn = mockTxn(950, '2023-01-01');
    let mocks = setupMocks(txn, [ghost]);
    let result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(1);
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 'ghost-tol');

    // Case 2: $1050
    txn = mockTxn(1050, '2023-01-01');
    mocks = setupMocks(txn, [ghost]);
    result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(1);
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 'ghost-tol');

    // Case 3: $949
    txn = mockTxn(949, '2023-01-01');
    mocks = setupMocks(txn, [ghost]);
    result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(0);
    expect(mocks.updateEqMock).not.toHaveBeenCalled();
  });

  test('Scenario 3: Tolerance (Date) - +/- 7 days', async () => {
    // Ghost due on 10th
    const ghost = mockGhost('ghost-date', 1000, '2023-01-10');

    // Case 1: Transaction on 3rd (7 days prior) -> Match
    let txn = mockTxn(1000, '2023-01-03');
    let mocks = setupMocks(txn, [ghost]);
    let result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(1);
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 'ghost-date');

    // Case 2: Transaction on 17th (7 days after) -> Match
    txn = mockTxn(1000, '2023-01-17');
    mocks = setupMocks(txn, [ghost]);
    result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(1);
    expect(mocks.updateEqMock).toHaveBeenCalledWith('id', 'ghost-date');

    // Case 3: Transaction on 2nd (>7 days prior) -> No Match
    // Wait, the logic in the service queries for +/- 7 days first.
    // If the date is outside the range, the database query (mocked) wouldn't return it.
    // However, our mock returns the ghost regardless of the query params (gte/lte are mocked to return 'this').
    // So the service logic relies on the query to filter dates.
    // BUT looking at `matching-service.ts`:
    // It does: .gte('expected_date', minDate).lte('expected_date', maxDate)
    // It does NOT re-check the date in JS logic.
    // So if the DB query is mocked to return the ghost, the service will assume it's valid date-wise.
    // To properly test this with mocks, we should simulate the DB query behavior or add a JS check in the service if we want strictly robust code.
    // However, relying on the DB query is standard.
    // In this unit test, since we mock the DB response, we can't test the DB query filtering unless we implement fake DB logic in the mock.
    // Let's implement a smarter mock for this test case to respect the date filtering.

    // Custom mock for date filtering
    const setupSmartDateMock = (transaction: any, ghosts: any[]) => {
      const updateEqMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'ledger_transactions') {
           return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: transaction, error: null })
          };
        }
        if (table === 'ghost_entries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockImplementation((col, minDate) => {
               // Filter ghosts
               const filtered = ghosts.filter(g => g[col] >= minDate);
               return {
                 lte: jest.fn().mockImplementation((col, maxDate) => {
                   const finalFiltered = filtered.filter(g => g[col] <= maxDate);
                   return { data: finalFiltered, error: null };
                 })
               };
            }),
             // Fallback if chain is different (it is not in the service code)
             // The service code is: .gte(...).lte(...)
            update: updateMock
          };
        }
        return {};
      });
      return { updateEqMock };
    };

    // Retry Case 3 with smart mock
    txn = mockTxn(1000, '2023-01-02'); // 8 days before Jan 10
    // minDate for Jan 2 txn is Dec 26 (-7) to Jan 9 (+7). Jan 10 is outside.
    // wait: minDate = txnDate - 7 days.
    // If txn is Jan 2, minDate = Dec 26, maxDate = Jan 9.
    // Ghost is Jan 10. Jan 10 > Jan 9. So it should not be returned by query.

    mocks = setupSmartDateMock(txn, [ghost]);
    result = await matchGhostEntries('txn-1');
    expect(result.matchedCount).toBe(0);
    expect(mocks.updateEqMock).not.toHaveBeenCalled();
  });


  test('Scenario 4: Conflict Resolution - Closest date', async () => {
    // Two PENDING Ghosts: Jan 1st, Jan 15th
    // Transaction: Jan 2nd
    // Jan 1st is 1 day diff. Jan 15th is 13 days diff.
    // Should pick Jan 1st.

    const ghost1 = mockGhost('ghost-jan1', 1000, '2023-01-01');
    const ghost2 = mockGhost('ghost-jan15', 1000, '2023-01-15');
    const txn = mockTxn(1000, '2023-01-02');

    // Need to use the smart mock or just return both because both are within +/- 7 days range?
    // txn Jan 2 -> range: Dec 26 to Jan 9.
    // Ghost Jan 15 is outside range!
    // So the query itself would filter out Ghost Jan 15.
    // To test conflict resolution, we need two ghosts WITHIN the range.

    // Let's adjust the test case to be valid for conflict resolution.
    // Transaction: Jan 5th. Range: Dec 29 to Jan 12.
    // Ghost 1: Jan 1st (4 days diff).
    // Ghost 2: Jan 8th (3 days diff). Matches!
    // Ghost 2 is closer.

    const ghostA = mockGhost('ghost-jan1', 1000, '2023-01-01');
    const ghostB = mockGhost('ghost-jan8', 1000, '2023-01-08');
    const txnConflict = mockTxn(1000, '2023-01-05');

    const { updateEqMock } = setupMocks(txnConflict, [ghostA, ghostB]);

    const result = await matchGhostEntries('txn-1');

    expect(result.matchedCount).toBe(1);
    expect(updateEqMock).toHaveBeenCalledWith('id', 'ghost-jan8'); // Closer one
  });

  test('Scenario 5: Database Integrity - transaction_id updated', async () => {
    const txn = mockTxn(1000, '2023-01-01');
    const ghost = mockGhost('ghost-integrity', 1000, '2023-01-01');

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

    await matchGhostEntries('txn-integrity');

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'MATCHED',
      transaction_id: 'txn-integrity',
      updated_at: expect.any(String)
    }));
  });
});
