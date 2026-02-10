import { createClient } from '@/lib/supabase/server';
import { getGhostEntries, getLedgerHistory, getAssets } from '@/lib/ledger/service';
import { getContacts } from '@/lib/directory';
import { Shell } from '@/src/components/layout/Shell';
import { LedgerHorizon } from '@/src/components/ledger/LedgerHorizon';
import { LedgerHistory } from '@/src/components/ledger/LedgerHistory';
import { LedgerHeader } from '@/src/components/ledger/LedgerHeader';

export default async function LedgerPage() {
  const supabase = await createClient();

  // Fetch data
  const ghostEntries = await getGhostEntries(supabase);
  const ledgerHistory = await getLedgerHistory(supabase);
  const assets = await getAssets(supabase);
  const contacts = await getContacts(supabase);

  return (
    <Shell>
      <div className="flex flex-col gap-0 min-h-screen pb-12">
        <LedgerHeader assets={assets} contacts={contacts} />

        <div className="flex flex-col border border-black shadow-sm bg-white">
          <LedgerHorizon ghostEntries={ghostEntries} />
          <LedgerHistory transactions={ledgerHistory} />
        </div>
      </div>
    </Shell>
  );
}
