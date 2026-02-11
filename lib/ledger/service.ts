import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { GhostEntry, LedgerTransaction, Asset, LedgerEntryType } from '../types';

export async function getAssets(supabase: SupabaseClient): Promise<Pick<Asset, 'id' | 'name' | 'currency'>[]> {
  const { data, error } = await supabase
    .from('assets')
    .select('id, name, currency')
    .order('name');

  if (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }

  return data as Pick<Asset, 'id' | 'name' | 'currency'>[];
}

export interface CreateTransactionData {
  description: string;
  date: string;
  contactId?: string | null;
  lines: {
    assetId: string;
    amount: number;
    type: LedgerEntryType;
  }[];
}

export async function createManualTransaction(
  supabase: SupabaseClient,
  data: CreateTransactionData
): Promise<string> {
  const { description, date, contactId, lines } = data;

  // 1. Create Transaction Header
  const { data: txn, error: txnError } = await supabase
    .from('ledger_transactions')
    .insert({
      description,
      date,
      contact_id: contactId
    })
    .select('id')
    .single();

  if (txnError) {
    console.error('Error creating transaction header:', txnError);
    throw txnError;
  }

  const transactionId = txn.id;
  const groupId = randomUUID();

  // 2. Prepare Lines
  const linesToInsert = lines.map((line) => ({
    transaction_id: transactionId,
    asset_id: line.assetId,
    amount: line.amount,
    type: line.type,
    group_id: groupId
  }));

  // 3. Insert Lines
  const { error: linesError } = await supabase
    .from('ledger_lines')
    .insert(linesToInsert);

  if (linesError) {
    console.error('Error creating transaction lines:', linesError);
    // Attempt rollback (delete header)
    await supabase.from('ledger_transactions').delete().eq('id', transactionId);
    throw linesError;
  }

  return transactionId;
}

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
        contact:contacts(*),
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
      contact:contacts(*),
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
