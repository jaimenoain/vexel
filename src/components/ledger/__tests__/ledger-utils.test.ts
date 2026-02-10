import { processLedgerTransactions, LedgerRow } from '../ledger-utils';
import { LedgerTransactionWithLines } from '@/lib/types';

describe('ledger-utils', () => {
  it('groups consecutive operating noise correctly', () => {
    // Mock data with positive amounts (standard double entry)
    const txns = [
      {
        id: 't1',
        date: '2023-01-02', // Newest
        description: 'Coffee',
        lines: [
          { asset: { type: 'BANK', name: 'Bank' }, amount: 5, type: 'CREDIT' },
          { asset: { type: 'EQUITY', name: 'Coffee' }, amount: 5, type: 'DEBIT' }
        ]
      },
      {
        id: 't2',
        date: '2023-01-01', // Oldest
        description: 'Coffee',
        lines: [
          { asset: { type: 'BANK', name: 'Bank' }, amount: 5, type: 'CREDIT' },
          { asset: { type: 'EQUITY', name: 'Coffee' }, amount: 5, type: 'DEBIT' }
        ]
      }
    ] as any as LedgerTransactionWithLines[];

    const result = processLedgerTransactions(txns, 100);

    expect(result).toHaveLength(1);
    expect(result[0].isGroup).toBe(true);
    expect(result[0].groupCount).toBe(2);
    // Balance after t1 (Newest) is 100.
    expect(result[0].balance).toBe(100);

    // Impact t1: -5. Out: 5.
    // Impact t2: -5. Out: 5.
    // Group Out: 10.
    expect(result[0].inAmount).toBe(0);
    expect(result[0].outAmount).toBe(10);
  });

  it('does not group non-consecutive noise', () => {
    const txns = [
      {
        id: 't1', date: '2023-01-03', description: 'Coffee',
        lines: [{ asset: { type: 'BANK' }, amount: 5, type: 'CREDIT' }, { asset: { type: 'EQUITY', name: 'Coffee' }, amount: 5, type: 'DEBIT' }]
      },
      {
        id: 't2', date: '2023-01-02', description: 'Rent',
        lines: [{ asset: { type: 'BANK' }, amount: 1000, type: 'CREDIT' }, { asset: { type: 'EQUITY', name: 'Rent' }, amount: 1000, type: 'DEBIT' }]
      },
      {
        id: 't3', date: '2023-01-01', description: 'Coffee',
        lines: [{ asset: { type: 'BANK' }, amount: 5, type: 'CREDIT' }, { asset: { type: 'EQUITY', name: 'Coffee' }, amount: 5, type: 'DEBIT' }]
      }
    ] as any as LedgerTransactionWithLines[];

    const result = processLedgerTransactions(txns, 1000);
    expect(result).toHaveLength(3);
    expect(result[0].category).toBe('Coffee');
    expect(result[1].category).toBe('Rent');
    expect(result[2].category).toBe('Coffee');
  });
});
