'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/src/components/layout/Shell';
import { PdfViewer } from '@/src/components/airlock/PdfViewer';
import { TransactionEditor } from '@/src/components/airlock/TransactionEditor';
import { useAuth } from '@/app/context/AuthContext';
import { AirlockItem } from '@/lib/types';

interface AirlockItemWithUrl extends AirlockItem {
  url: string | null;
}

export default function AirlockPage() {
  const params = useParams();
  const id = params?.id as string;
  const { session, loading: authLoading } = useAuth();
  const [item, setItem] = useState<AirlockItemWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
        // Auth context handles redirection usually, or we show loading
        return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/airlock/${id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Error fetching airlock item: ${res.statusText}`);
        }

        const data = await res.json();
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, session, authLoading]);

  if (loading || authLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-full text-red-500">
          <p>Error: {error}</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col md:flex-row h-full gap-6">
        {/* Left Pane - PDF Viewer */}
        <div className="w-full md:w-1/2 h-[calc(100vh-140px)] md:h-full min-h-[500px]">
           <PdfViewer url={item?.url ?? null} />
        </div>

        {/* Right Pane - Editor Placeholder */}
        <div className="w-full md:w-1/2 h-full bg-white border border-[#E5E5E5] p-6 relative">
          <TransactionEditor
            key={item?.id ?? 'loading'}
            initialData={item?.ai_payload ?? null}
          />
          {/* Debug info - Optional, kept for visibility */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-300">
             Confidence: {item?.confidence_score}
          </div>
        </div>
      </div>
    </Shell>
  );
}
