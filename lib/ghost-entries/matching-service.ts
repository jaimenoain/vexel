import { supabaseAdmin } from '../supabase-admin';

interface LedgerLine {
  id: string;
  transaction_id: string;
  asset_id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
}

interface LedgerTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  ledger_lines: LedgerLine[];
}

interface GhostEntry {
  id: string;
  asset_id: string;
  expected_amount: number;
  expected_date: string; // YYYY-MM-DD
  status: 'PENDING' | 'MATCHED' | 'OVERDUE' | 'VOIDED';
}

/**
 * Matches pending Ghost Entries to a newly created Ledger Transaction.
 *
 * Logic:
 * 1. Fetch transaction and its lines.
 * 2. For each line, find 'PENDING' ghost entries with:
 *    - Same asset_id
 *    - expected_date within +/- 7 days of transaction date
 *    - expected_amount within +/- 5% of transaction line amount (absolute value)
 * 3. Resolve conflicts by picking the ghost with the closest date.
 * 4. Mark matched ghosts as 'MATCHED' and link the transaction.
 */
export async function matchGhostEntries(transactionId: string): Promise<{ matchedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let matchedCount = 0;
  const matchedGhostIds = new Set<string>();

  try {
    // 1. Fetch Transaction with Lines
    const { data: transaction, error: txnError } = await supabaseAdmin
      .from('ledger_transactions')
      .select('*, ledger_lines(*)')
      .eq('id', transactionId)
      .single();

    if (txnError || !transaction) {
      console.error('Error fetching transaction:', txnError);
      return { matchedCount, errors: [`Transaction not found: ${txnError?.message}`] };
    }

    const txn = transaction as LedgerTransaction;
    const txnDate = new Date(txn.date);

    if (!txn.ledger_lines || txn.ledger_lines.length === 0) {
      return { matchedCount, errors };
    }

    // 2. Iterate lines
    for (const line of txn.ledger_lines) {
      const lineAmountAbs = Math.abs(line.amount);

      // Date range: +/- 7 days
      const minDate = new Date(txnDate);
      minDate.setDate(minDate.getDate() - 7);
      const maxDate = new Date(txnDate);
      maxDate.setDate(maxDate.getDate() + 7);

      // Query candidates
      const { data: candidates, error: ghostError } = await supabaseAdmin
        .from('ghost_entries')
        .select('*')
        .eq('status', 'PENDING')
        .eq('asset_id', line.asset_id)
        .gte('expected_date', minDate.toISOString().split('T')[0])
        .lte('expected_date', maxDate.toISOString().split('T')[0]);

      if (ghostError) {
        errors.push(`Error fetching ghosts for line ${line.id}: ${ghostError.message}`);
        continue;
      }

      if (!candidates || candidates.length === 0) {
        continue;
      }

      // Filter by Amount (+/- 5%) and exclude already matched in this run
      const validCandidates = (candidates as GhostEntry[]).filter(ghost => {
        if (matchedGhostIds.has(ghost.id)) return false;

        const ghostAmountAbs = Math.abs(ghost.expected_amount);
        const diff = Math.abs(ghostAmountAbs - lineAmountAbs);
        const tolerance = lineAmountAbs * 0.05;

        // Ensure tolerance is at least some epsilon if amount is 0 (unlikely for ledger)
        // Check if within tolerance
        return diff <= tolerance;
      });

      if (validCandidates.length === 0) {
        continue;
      }

      // 3. Conflict Resolution: Closest Date
      validCandidates.sort((a, b) => {
        const dateA = new Date(a.expected_date).getTime();
        const dateB = new Date(b.expected_date).getTime();
        const txnTime = txnDate.getTime();

        const diffA = Math.abs(dateA - txnTime);
        const diffB = Math.abs(dateB - txnTime);

        return diffA - diffB;
      });

      const bestMatch = validCandidates[0];

      // 4. Update Ghost Entry
      const { error: updateError } = await supabaseAdmin
        .from('ghost_entries')
        .update({
          status: 'MATCHED',
          transaction_id: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bestMatch.id);

      if (updateError) {
        errors.push(`Error updating ghost ${bestMatch.id}: ${updateError.message}`);
      } else {
        matchedCount++;
        matchedGhostIds.add(bestMatch.id);
        console.log(`Matched ghost ${bestMatch.id} to transaction line ${line.id}`);
      }
    }

  } catch (e: any) {
    console.error('Unexpected error in matchGhostEntries:', e);
    errors.push(e.message);
  }

  return { matchedCount, errors };
}
