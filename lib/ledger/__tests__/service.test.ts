import { createManualTransaction } from '../service';
import { LedgerEntryType } from '../../types';

describe('createManualTransaction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
  });

  it('should create transaction header and lines successfully', async () => {
    // Mock header creation success: insert returns 'this', then select returns 'this', then single returns promise
    // Wait, insert returns query builder which has select/single?
    // In my code:
    // .insert(...) .select('id') .single()
    // So insert returns builder, select returns builder, single returns promise.

    // I need to mock the chain properly.
    // The mockSupabase setup does insert().select().single() -> returns promise.

    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'txn-123' }, error: null });

    // For lines insert:
    // .insert(...) -> returns promise with { error }
    // But wait, the first insert (header) is chained with select/single.
    // The second insert (lines) is just .insert(...) awaited.
    // So insert() must return 'this' (builder) OR promise depending on call?
    // Actually, Supabase query builder is thenable.

    // Simplest mock for chained calls:
    // from() -> builder
    // insert() -> builder (if chained) or promise-like if awaited directly?
    // In code:
    // Header: await supabase.from().insert().select().single()
    // Lines: await supabase.from().insert()

    // So for header, insert returns builder.
    // For lines, insert returns promise.

    // I'll make insert return a mock that is BOTH a builder AND has a then method?
    // Or just make it return 'this' and mock 'then' on 'this'?
    // But 'single' is called on header chain.

    // Let's refine the mock.
    const mockBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'txn-123' }, error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      // For lines insert (awaited directly), it needs 'then'.
      // But lines insert is NOT chained with select/single.
      // So if I call insert() and await it, it calls 'then'.
      // But if I call insert().select(), it calls select on the result of insert().

      // I can make insert() return a customized object based on calls? No, Jest mocks are static usually.

      // Strategy:
      // insert() returns a Promise-like object that also has builder methods.
      // Or simply:
      // insert() returns 'this'.
      // 'this' has 'then' (so it can be awaited).
      // But 'this' also has 'select', 'single'.
    };

    // If I add 'then' to mockBuilder, header creation will try to await it?
    // No, header creation calls .select().single().
    // So as long as select() is called synchronously, it's fine.

    // But for Lines, we await insert().
    // So insert() must return something that resolves to { error: null }.

    // Let's separate the mocks based on 'from' argument.

    const headerBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'txn-123' }, error: null }),
      delete: jest.fn().mockReturnThis(), // For rollback
      eq: jest.fn().mockResolvedValue({ error: null }) // For rollback delete execution
    };

    const linesBuilder = {
       insert: jest.fn().mockResolvedValue({ error: null })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ledger_transactions') return headerBuilder;
      if (table === 'ledger_lines') return linesBuilder;
      return headerBuilder;
    });

    const data = {
      description: 'Test Transaction',
      date: '2023-01-01',
      lines: [
        { assetId: 'asset-1', amount: 50, type: 'DEBIT' as LedgerEntryType },
        { assetId: 'asset-2', amount: -50, type: 'CREDIT' as LedgerEntryType }
      ]
    };

    const txnId = await createManualTransaction(mockSupabase, data);

    expect(txnId).toBe('txn-123');

    // Verify header insert
    expect(mockSupabase.from).toHaveBeenCalledWith('ledger_transactions');
    expect(headerBuilder.insert).toHaveBeenCalledWith({
      description: 'Test Transaction',
      date: '2023-01-01'
    });

    // Verify lines insert
    expect(mockSupabase.from).toHaveBeenCalledWith('ledger_lines');
    expect(linesBuilder.insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        transaction_id: 'txn-123',
        asset_id: 'asset-1',
        amount: 50,
        type: 'DEBIT',
        group_id: expect.any(String)
      }),
      expect.objectContaining({
        transaction_id: 'txn-123',
        asset_id: 'asset-2',
        amount: -50,
        type: 'CREDIT',
        group_id: expect.any(String)
      })
    ]));
  });

  it('should rollback transaction if lines insertion fails', async () => {
     const headerBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'txn-123' }, error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }) // For delete().eq() await
    };

    const linesBuilder = {
       insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ledger_transactions') return headerBuilder;
      if (table === 'ledger_lines') return linesBuilder;
      return headerBuilder;
    });

    const data = {
      description: 'Test Transaction',
      date: '2023-01-01',
      lines: []
    };

    await expect(createManualTransaction(mockSupabase, data)).rejects.toEqual({ message: 'Insert failed' });

    // Verify delete called
    expect(mockSupabase.from).toHaveBeenCalledWith('ledger_transactions');
    expect(headerBuilder.delete).toHaveBeenCalled();
    expect(headerBuilder.eq).toHaveBeenCalledWith('id', 'txn-123');
  });
});
