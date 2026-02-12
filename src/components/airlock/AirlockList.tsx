'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface AirlockItem {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'REVIEW_NEEDED' | 'READY_TO_COMMIT' | 'ERROR';
  traffic_light: 'RED' | 'YELLOW' | 'GREEN' | null;
  confidence_score: number;
  created_at: string;
  ai_payload: any;
  file_path: string;
}

const fetcher = ([url, token]: [string, string]) => fetch(url, {
    headers: {
        Authorization: `Bearer ${token}`
    }
}).then(async (res) => {
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch');
    }
    return res.json();
});

export function AirlockList({ assetId }: { assetId?: string | null }) {
  const { session } = useAuth();
  const token = session?.access_token;
  const url = assetId ? `/api/airlock?asset_id=${assetId}` : '/api/airlock';

  const { data: items, error, isLoading } = useSWR<AirlockItem[]>(
      token ? [url, token] : null,
      fetcher,
      { refreshInterval: 5000 }
  );

  if (isLoading) {
      return (
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />
          ))}
        </div>
      );
  }

  if (error) return <div className="text-red-500 p-4 bg-red-50 rounded mt-6">Failed to load airlock items: {error.message}</div>;

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-200 rounded-lg mt-6 bg-zinc-50/50">
        <CheckCircle className="w-12 h-12 mb-4 text-zinc-300" />
        <p className="text-lg font-medium text-zinc-900">All Systems Nominal</p>
        <p>No pending data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      {items.map((item) => (
        <div key={item.id} className="flex items-center p-4 bg-white border border-zinc-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="mr-4 flex-shrink-0">
            <StatusIcon status={item.status} trafficLight={item.traffic_light} />
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center justify-between mb-1">
                 <h3 className="font-medium text-zinc-900 truncate pr-4" title={getFilename(item.file_path)}>
                    {getFilename(item.file_path) || `Document ${item.id.slice(0, 8)}`}
                 </h3>
                 <span className="text-xs text-zinc-500 whitespace-nowrap font-mono">
                    {new Date(item.created_at).toLocaleDateString()}
                 </span>
             </div>
             <div className="flex items-center text-sm text-zinc-500 gap-2">
                 <span className="capitalize">{item.status.toLowerCase().replace(/_/g, ' ')}</span>
                 {['QUEUED', 'PROCESSING'].includes(item.status) && (
                   <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"/>
                 )}
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusIcon({ status, trafficLight }: { status: string, trafficLight: string | null }) {
    if (status === 'QUEUED' || status === 'PROCESSING') return <Clock className="w-5 h-5 text-blue-500" />;
    if (status === 'ERROR') return <AlertTriangle className="w-5 h-5 text-red-500" />;

    // Traffic light logic
    if (trafficLight === 'RED') return <div className="w-3 h-3 bg-red-500 rounded-full ring-2 ring-red-100" />;
    if (trafficLight === 'YELLOW') return <div className="w-3 h-3 bg-yellow-500 rounded-full ring-2 ring-yellow-100" />;
    if (trafficLight === 'GREEN') return <div className="w-3 h-3 bg-green-500 rounded-full ring-2 ring-green-100" />;

    return <FileText className="w-5 h-5 text-zinc-400" />;
}

function getFilename(path: string | null): string {
    if (!path) return 'Unknown File';
    // Path: folder/uuid/filename
    const parts = path.split('/');
    return parts.length > 2 ? parts.slice(2).join('/') : path;
}
