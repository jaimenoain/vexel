import { LedgerTransaction, LedgerViewItem, GroupedTransaction, LedgerLine } from '../types';

const EXCLUDED_OPERATING_ASSET_NAMES = [
  'Capital Call',
  'Distribution',
  'Transfer',
  'Investment',
  'Opening Balance'
];

function isOperatingExpenseAsset(asset: any): boolean {
  if (!asset) return false;
  // Expense assets are those that are NOT Bank or Property
  if (asset.type === 'BANK' || asset.type === 'PROPERTY') return false;
  // And not in the excluded list
  if (EXCLUDED_OPERATING_ASSET_NAMES.includes(asset.name)) return false;
  return true;
}

export function isOperatingNoise(transaction: LedgerTransaction): boolean {
  // A transaction is operating noise if all its DEBIT lines are to operating expense assets.
  // And it must have at least one debit line.
  const debitLines = transaction.lines.filter(l => l.type === 'DEBIT');
  if (debitLines.length === 0) return false;

  return debitLines.every(l => isOperatingExpenseAsset(l.asset));
}

export function groupTransactions(transactions: LedgerTransaction[]): LedgerViewItem[] {
  const result: LedgerViewItem[] = [];
  let currentGroup: LedgerTransaction[] = [];

  for (const txn of transactions) {
    if (isOperatingNoise(txn)) {
      currentGroup.push(txn);
    } else {
      if (currentGroup.length > 0) {
        // Close current group
        if (currentGroup.length === 1) {
          result.push(currentGroup[0]);
        } else {
          result.push(createGroupedTransaction(currentGroup));
        }
        currentGroup = [];
      }
      result.push(txn);
    }
  }

  // Handle remaining group
  if (currentGroup.length > 0) {
    if (currentGroup.length === 1) {
      result.push(currentGroup[0]);
    } else {
      result.push(createGroupedTransaction(currentGroup));
    }
  }

  return result;
}

function createGroupedTransaction(txns: LedgerTransaction[]): GroupedTransaction {
  // Sum debit amounts to expense assets
  const totalAmount = txns.reduce((sum, txn) => {
    const debitSum = txn.lines
      .filter(l => l.type === 'DEBIT')
      .reduce((s, l) => s + Number(l.amount), 0);
    return sum + debitSum;
  }, 0);

  return {
    id: `group-${txns[0].id}`,
    description: `Operating Expenses (${txns.length} items)`,
    date: txns[0].date, // Date of the newest transaction in the group
    total_amount: totalAmount,
    items: txns,
  };
}

export function getTransactionDisplayData(
  item: LedgerViewItem,
  currentAssetId?: string
): {
  date: string;
  description: string;
  category: string;
  inAmount?: number;
  outAmount?: number;
} {
  if ('items' in item) {
    // It's a group
    return {
      date: item.date,
      description: item.description,
      category: 'Operating Expenses',
      outAmount: item.total_amount, // Operating expenses are Outflows
    };
  }

  // Single transaction
  const txn = item as LedgerTransaction;

  // 1. Asset Context View
  if (currentAssetId) {
    const myLines = txn.lines.filter(l => l.asset_id === currentAssetId);

    const debitSum = myLines.filter(l => l.type === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0);
    const creditSum = myLines.filter(l => l.type === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);

    let inAmount = undefined;
    let outAmount = undefined;

    if (debitSum > 0) inAmount = debitSum;
    if (creditSum > 0) outAmount = creditSum;

    const otherLines = txn.lines.filter(l => l.asset_id !== currentAssetId);
    const category = otherLines.map(l => l.asset?.name || 'Unknown').join(', ') || 'Split';

    return {
      date: txn.date,
      description: txn.description,
      category,
      inAmount,
      outAmount
    };
  }

  // 2. Global View
  const debitLines = txn.lines.filter(l => l.type === 'DEBIT');
  const creditLines = txn.lines.filter(l => l.type === 'CREDIT');

  // Check for Expense (Debit to Non-Bank/Prop)
  const isExpense = debitLines.every(l => isOperatingExpenseAsset(l.asset));
  if (isExpense) {
     const amount = debitLines.reduce((s, l) => s + Number(l.amount), 0);
     return {
       date: txn.date,
       description: txn.description,
       category: debitLines.map(l => l.asset?.name).join(', '),
       outAmount: amount
     };
  }

  // Check for Income (Credit to Equity/Other)
  // Assuming if it's not a Bank/Prop transfer, and credits are to Equity...
  // Or simply: If Debits are to Bank/Prop and Credits are NOT to Bank/Prop.
  const debitBankProp = debitLines.every(l => l.asset?.type === 'BANK' || l.asset?.type === 'PROPERTY');
  const creditNotBankProp = creditLines.every(l => l.asset?.type !== 'BANK' && l.asset?.type !== 'PROPERTY');

  if (debitBankProp && creditNotBankProp) {
     const amount = debitLines.reduce((s, l) => s + Number(l.amount), 0);
     return {
       date: txn.date,
       description: txn.description,
       category: creditLines.map(l => l.asset?.name).join(', '),
       inAmount: amount
     };
  }

  // Transfer or Complex
  const amount = debitLines.reduce((s, l) => s + Number(l.amount), 0);
  return {
    date: txn.date,
    description: txn.description,
    category: 'Transfer / Adjustment',
    inAmount: amount,
    outAmount: amount
  };
}
