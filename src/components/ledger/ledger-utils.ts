import { LedgerTransactionWithLines } from '@/lib/types';

export interface LedgerRow extends LedgerTransactionWithLines {
  balance: number;
  category: string;
  inAmount: number;
  outAmount: number;
  isNoise: boolean;
  isGroup?: boolean;
  groupCount?: number;
  groupItems?: LedgerRow[];
}

// Logic from view_net_operating_outflow
const EXCLUDED_CATEGORIES = ['Capital Call', 'Distribution', 'Transfer', 'Investment', 'Opening Balance'];

function isOperatingNoise(category: string, assetType: string): boolean {
  if (assetType === 'BANK' || assetType === 'PROPERTY') return false;
  if (EXCLUDED_CATEGORIES.includes(category)) return false;
  return true;
}

function getTransactionDetails(txn: LedgerTransactionWithLines): { category: string; impact: number; inAmount: number; outAmount: number; isNoise: boolean } {
  // Find lines affecting Net Worth (Bank/Property)
  const netWorthLines = txn.lines.filter(l => ['BANK', 'PROPERTY'].includes(l.asset.type));

  // Calculate impact: Sum(Debit) - Sum(Credit)
  // Debit to Asset increases value. Credit decreases.
  const impact = netWorthLines.reduce((sum, line) => {
    return sum + (line.type === 'DEBIT' ? Number(line.amount) : -Number(line.amount));
  }, 0);

  // Determine Category
  // Find the "other side". The side that is NOT Bank/Property.
  const otherLines = txn.lines.filter(l => !['BANK', 'PROPERTY'].includes(l.asset.type));
  let category = 'Transfer'; // Default if only Bank/Property involved
  let assetType = 'BANK'; // Default

  if (otherLines.length > 0) {
    const otherAsset = otherLines[0].asset;
    category = otherAsset.name;
    assetType = otherAsset.type;
  } else if (netWorthLines.length > 0) {
      // Transfer between banks?
      category = 'Transfer';
  }

  const isNoise = isOperatingNoise(category, assetType);

  const inAmount = impact > 0 ? impact : 0;
  const outAmount = impact < 0 ? -impact : 0;

  return { category, impact, inAmount, outAmount, isNoise };
}

export function processLedgerTransactions(
  transactions: LedgerTransactionWithLines[],
  currentBalance: number
): LedgerRow[] {
  // 1. Calculate Balances & Details
  const processed: LedgerRow[] = [];
  let runningBalance = currentBalance;

  for (const txn of transactions) {
    const details = getTransactionDetails(txn);
    const row: LedgerRow = {
      ...txn,
      balance: runningBalance,
      category: details.category,
      inAmount: details.inAmount,
      outAmount: details.outAmount,
      isNoise: details.isNoise,
    };
    processed.push(row);

    // Update balance for the *next* (older) row
    runningBalance -= details.impact;
  }

  // 2. Group Operating Noise
  const result: LedgerRow[] = [];
  let buffer: LedgerRow[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;

    if (buffer.length === 1) {
      result.push(buffer[0]);
    } else {
      // Create Group
      const first = buffer[0]; // Newest
      // Sum in/out
      const totalIn = buffer.reduce((sum, item) => sum + item.inAmount, 0);
      const totalOut = buffer.reduce((sum, item) => sum + item.outAmount, 0);

      const groupRow: LedgerRow = {
        ...first, // Use newest as base
        id: `group-${first.id}`,
        description: `${first.category} (${buffer.length} items)`, // Override description
        isGroup: true,
        groupCount: buffer.length,
        groupItems: buffer, // Store underlying items
        inAmount: totalIn,
        outAmount: totalOut,
        // Balance is already correct (balance of the newest item)
      };
      result.push(groupRow);
    }
    buffer = [];
  };

  for (const row of processed) {
    if (row.isNoise) {
      if (buffer.length > 0) {
        const last = buffer[buffer.length - 1];
        const sameMonth = row.date.substring(0, 7) === last.date.substring(0, 7);
        const sameCategory = row.category === last.category;

        if (sameMonth && sameCategory) {
          buffer.push(row);
        } else {
          flushBuffer();
          buffer.push(row);
        }
      } else {
        buffer.push(row);
      }
    } else {
      flushBuffer();
      result.push(row);
    }
  }
  flushBuffer();

  return result;
}
