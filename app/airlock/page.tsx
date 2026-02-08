'use client';

import { useSearchParams } from 'next/navigation';
import { Shell } from '@/src/components/layout/Shell';

export default function AirlockQueuePage() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('asset_id');

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-[#E5E5E5] pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Airlock Queue</h1>
          {assetId && (
            <span className="text-sm bg-gray-100 px-2 py-1 rounded">
              Filtered by Asset: {assetId}
            </span>
          )}
        </div>

        <div className="p-6 border border-dashed border-[#E5E5E5] rounded flex flex-col items-center justify-center text-gray-500 h-64">
           <p>Airlock Queue Implementation Pending.</p>
           {assetId && (
               <p className="mt-2 text-sm text-[#111111]">
                   Please upload proof for Asset ID: {assetId}
               </p>
           )}
        </div>
      </div>
    </Shell>
  );
}
