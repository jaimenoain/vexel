'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/src/components/layout/Shell';
import { Button } from '@/src/components/common/Button';
import { Upload } from 'lucide-react';
import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { Entity } from '@/lib/types';

// Helper to find asset name from the directory tree
function findAsset(entities: Entity[], assetId: string) {
  for (const entity of entities) {
    const asset = entity.assets.find(a => a.id === assetId);
    if (asset) return asset;
  }
  return null;
}

export default function AssetDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = use(params);
  const router = useRouter();
  const { session } = useAuth();

  // Re-fetch directory to get the name (SWR will likely cache this)
  const { data } = useSWR<Entity[]>(
    session ? ['/api/directory', session.access_token] : null,
    ([url, token]: [string, string]) => fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json())
  );

  const asset = data ? findAsset(data, assetId) : null;
  const assetName = asset?.name || assetId;

  return (
    <Shell>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">{assetName}</h1>
            <p className="text-gray-500 text-sm mt-1">Asset ID: {assetId}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/airlock?asset_id=${assetId}`)}
            icon={<Upload className="w-4 h-4" />}
          >
            Upload Documents
          </Button>
        </div>

        <div className="border border-dashed border-[#E5E5E5] rounded p-12 text-center text-gray-400">
          Transaction History (Placeholder)
        </div>
      </div>
    </Shell>
  );
}
