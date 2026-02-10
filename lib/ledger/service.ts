import { createClient } from '@/lib/supabase/server';
import { GhostEntry, LedgerTransactionWithLines } from '@/lib/types';

/**
 * Fetches ghost entries (future/pending transactions).
 * @param assetId Optional asset ID to filter by.
 */
export async function getGhostEntries(assetId?: string): Promise<GhostEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from('ghost_entries')
    .select('*')
    .in('status', ['PENDING', 'OVERDUE'])
    .order('expected_date', { ascending: true });

  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as GhostEntry[];
}

/**
 * Fetches ledger history (transactions) and the current total balance.
 * The balance is calculated as the sum of all BANK and PROPERTY assets.
 * @param assetId Optional asset ID to filter by.
 */
export async function getLedgerHistory(assetId?: string): Promise<{ transactions: LedgerTransactionWithLines[]; currentBalance: number }> {
  const supabase = await createClient();

  let targetAssetIds: string[] = [];

  if (assetId) {
    targetAssetIds = [assetId];
  } else {
    // For Global View, identify assets that contribute to "Net Worth" (BANK and PROPERTY).
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('id')
      .in('type', ['BANK', 'PROPERTY']);

    if (assetsError) throw assetsError;
    targetAssetIds = assets.map(a => a.id);
  }

  // 1. Fetch current balance(s) for the target assets
  let currentBalance = 0;
  if (targetAssetIds.length > 0) {
    const { data: balanceData, error: balanceError } = await supabase
      .from('view_asset_balances')
      .select('balance')
      .in('asset_id', targetAssetIds);

    if (balanceError) throw balanceError;

    currentBalance = balanceData?.reduce((sum, row) => sum + Number(row.balance), 0) || 0;
  }

  // 2. Fetch Transactions
  // We need transactions and their lines.
  let txnQuery = supabase
    .from('ledger_transactions')
    .select(`
      *,
      lines:ledger_lines(
        *,
        asset:assets(*)
      )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (assetId) {
    // Filter by transactions that involve the specific asset.
    const { data: lines, error: lineError } = await supabase
      .from('ledger_lines')
      .select('transaction_id')
      .eq('asset_id', assetId);

    if (lineError) throw lineError;

    const ids = Array.from(new Set(lines?.map((l) => l.transaction_id) || []));

    if (ids.length > 0) {
      txnQuery = txnQuery.in('id', ids);
    } else {
      return { transactions: [], currentBalance };
    }
  }

  const { data: transactions, error: txnError } = await txnQuery;
  if (txnError) throw txnError;

  return {
    transactions: (transactions as any) as LedgerTransactionWithLines[],
    currentBalance,
  };
}
