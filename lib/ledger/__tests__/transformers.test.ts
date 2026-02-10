import { isOperatingNoise, groupTransactions, getTransactionDisplayData } from '../transformers';
import { LedgerTransaction, LedgerLine, Asset, AssetType, LedgerViewItem, GroupedTransaction } from '../../types';

// Mock Assets
const bankAsset: Asset = {
  id: 'bank-1',
  name: 'Chase Checking',
  type: 'BANK',
  currency: 'USD',
  net_worth: 10000,
};

const expenseAsset: Asset = {
  id: 'expense-1',
  name: 'Coffee',
  type: 'EQUITY', // Expenses are typically nominal accounts
  currency: 'USD',
  net_worth: 0,
};

const incomeAsset: Asset = {
  id: 'income-1',
  name: 'Salary',
  type: 'EQUITY',
  currency: 'USD',
  net_worth: 0,
};

const capitalCallAsset: Asset = {
  id: 'cc-1',
  name: 'Capital Call',
  type: 'EQUITY',
  currency: 'USD',
  net_worth: 0,
};

// Helper to create txn
function createTxn(
  id: string,
  desc: string,
  linesSpec: { asset: Asset; amount: number; type: 'DEBIT' | 'CREDIT' }[]
): LedgerTransaction {
  return {
    id,
    description: desc,
    date: '2023-01-01',
    created_at: '2023-01-01T00:00:00Z',
    lines: linesSpec.map((spec, idx) => ({
      id: `${id}-line-${idx}`,
      transaction_id: id,
      asset_id: spec.asset.id,
      asset: spec.asset,
      amount: spec.amount,
      type: spec.type,
    })),
  };
}

describe('isOperatingNoise', () => {
  it('identifies standard expense as noise', () => {
    // Debit Expense, Credit Bank
    const txn = createTxn('t1', 'Starbucks', [
      { asset: expenseAsset, amount: 5, type: 'DEBIT' },
      { asset: bankAsset, amount: 5, type: 'CREDIT' },
    ]);
    expect(isOperatingNoise(txn)).toBe(true);
  });

  it('does not identify income as noise', () => {
    // Debit Bank, Credit Income
    const txn = createTxn('t2', 'Paycheck', [
      { asset: bankAsset, amount: 5000, type: 'DEBIT' },
      { asset: incomeAsset, amount: 5000, type: 'CREDIT' },
    ]);
    expect(isOperatingNoise(txn)).toBe(false);
  });

  it('does not identify excluded asset names as noise', () => {
    // Debit Capital Call, Credit Bank
    const txn = createTxn('t3', 'Invest', [
      { asset: capitalCallAsset, amount: 1000, type: 'DEBIT' },
      { asset: bankAsset, amount: 1000, type: 'CREDIT' },
    ]);
    expect(isOperatingNoise(txn)).toBe(false);
  });
});

describe('groupTransactions', () => {
  it('groups consecutive noise transactions', () => {
    const t1 = createTxn('t1', 'Coffee', [{ asset: expenseAsset, amount: 5, type: 'DEBIT' }, { asset: bankAsset, amount: 5, type: 'CREDIT' }]);
    const t2 = createTxn('t2', 'Uber', [{ asset: expenseAsset, amount: 20, type: 'DEBIT' }, { asset: bankAsset, amount: 20, type: 'CREDIT' }]);
    const t3 = createTxn('t3', 'Salary', [{ asset: bankAsset, amount: 5000, type: 'DEBIT' }, { asset: incomeAsset, amount: 5000, type: 'CREDIT' }]); // Not noise

    const result = groupTransactions([t1, t2, t3]);

    expect(result).toHaveLength(2);
    // First item is Group
    expect((result[0] as GroupedTransaction).items).toHaveLength(2);
    expect((result[0] as GroupedTransaction).total_amount).toBe(25);
    // Second item is t3
    expect((result[1] as LedgerTransaction).id).toBe('t3');
  });

  it('returns single items if no groups', () => {
    const t1 = createTxn('t1', 'Salary', [{ asset: bankAsset, amount: 5000, type: 'DEBIT' }, { asset: incomeAsset, amount: 5000, type: 'CREDIT' }]);
    const result = groupTransactions([t1]);
    expect(result).toHaveLength(1);
    expect((result[0] as LedgerTransaction).id).toBe('t1');
  });
});

describe('getTransactionDisplayData', () => {
  it('calculates global view for expense correctly', () => {
    const txn = createTxn('t1', 'Coffee', [{ asset: expenseAsset, amount: 5, type: 'DEBIT' }, { asset: bankAsset, amount: 5, type: 'CREDIT' }]);
    const data = getTransactionDisplayData(txn);
    expect(data.outAmount).toBe(5);
    expect(data.category).toBe('Coffee');
  });

  it('calculates asset context view correctly (Bank)', () => {
    const txn = createTxn('t1', 'Coffee', [{ asset: expenseAsset, amount: 5, type: 'DEBIT' }, { asset: bankAsset, amount: 5, type: 'CREDIT' }]);
    // Context: Bank
    const data = getTransactionDisplayData(txn, bankAsset.id);
    // Bank credited -> Out
    expect(data.outAmount).toBe(5);
    expect(data.category).toBe('Coffee');
  });
});
