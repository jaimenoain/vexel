import { SupabaseClient } from '@supabase/supabase-js';
import { GhostEntry, LedgerTransaction } from '../types';

export async function getGhostEntries(supabase: SupabaseClient, assetId?: string): Promise<GhostEntry[]> {
  let query = supabase
    .from('ghost_entries')
    .select(`
      *,
      asset:assets(*)
    `)
    .in('status', ['PENDING', 'OVERDUE'])
    .order('expected_date', { ascending: true });

  if (assetId) {
    query = query.eq('asset_id', assetId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching ghost entries:', error);
    throw error;
  }

  return data as GhostEntry[];
}

export async function getLedgerHistory(supabase: SupabaseClient, assetId?: string): Promise<LedgerTransaction[]> {
  if (assetId) {
    // 1. Find relevant transaction IDs
    const { data: relevantLines, error: lineError } = await supabase
      .from('ledger_lines')
      .select('transaction_id')
      .eq('asset_id', assetId);

    if (lineError) {
      console.error('Error fetching ledger lines:', lineError);
      throw lineError;
    }

    if (!relevantLines || relevantLines.length === 0) {
      return [];
    }

    const txnIds = Array.from(new Set(relevantLines.map((l) => l.transaction_id)));

    // 2. Fetch full transactions with all lines
    const { data, error } = await supabase
      .from('ledger_transactions')
      .select(`
        *,
        lines:ledger_lines(
          *,
          asset:assets(*)
        )
      `)
      .in('id', txnIds)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching ledger transactions:', error);
      throw error;
    }

    return data as LedgerTransaction[];
  }

  // Global fetch
  const { data, error } = await supabase
    .from('ledger_transactions')
    .select(`
      *,
      lines:ledger_lines(
        *,
        asset:assets(*)
      )
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching ledger transactions:', error);
    throw error;
  }

  return data as LedgerTransaction[];
}
