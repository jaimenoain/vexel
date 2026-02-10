import React from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { LedgerHorizon } from '@/src/components/ledger/LedgerHorizon';
import { LedgerHistory } from '@/src/components/ledger/LedgerHistory';
import { getGhostEntries, getLedgerHistory } from '@/lib/ledger/service';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const ghosts = await getGhostEntries();
  const { transactions, currentBalance } = await getLedgerHistory();

  return (
    <Shell>
      <div className="flex flex-col gap-8">
        <LedgerHorizon ghosts={ghosts} />
        <LedgerHistory transactions={transactions} initialBalance={currentBalance} />
      </div>
    </Shell>
  );
}
