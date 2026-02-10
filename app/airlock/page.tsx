'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { AirlockDropzone } from '@/src/components/airlock/AirlockDropzone';
import { AirlockList } from '@/src/components/airlock/AirlockList';

function AirlockContent() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('asset_id');

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20 md:pb-0">
      <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Airlock Queue</h1>
          <p className="text-sm text-zinc-500 mt-1">Ingest and validate raw financial documents.</p>
        </div>
        {assetId && (
          <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded text-zinc-600">
            Asset: {assetId.slice(0, 8)}...
          </span>
        )}
      </div>

      <AirlockDropzone assetId={assetId} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Pending Items</h2>
        <AirlockList assetId={assetId} />
      </div>
    </div>
  );
}

export default function AirlockQueuePage() {
  return (
    <Shell>
      <Suspense fallback={<div className="p-6 text-zinc-500">Loading airlock queue...</div>}>
        <AirlockContent />
      </Suspense>
    </Shell>
  );
}
