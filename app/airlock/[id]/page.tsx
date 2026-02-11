'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/src/components/layout/Shell';
import { PdfViewer } from '@/src/components/airlock/PdfViewer';
import { TransactionEditor } from '@/src/components/airlock/TransactionEditor';
import { useAuth } from '@/app/context/AuthContext';
import { AirlockItem } from '@/lib/types';
import { AirlockMobileList } from '@/src/components/airlock/AirlockMobileList';
import { AirlockMobileModal } from '@/src/components/airlock/AirlockMobileModal';
import { createClient } from '@/lib/supabase/client';

interface AirlockItemWithUrl extends AirlockItem {
  url: string | null;
}

export default function AirlockPage() {
  const params = useParams();
  const id = params?.id as string;
  const { session, loading: authLoading } = useAuth();
  // const session = { access_token: 'mock' };
  // const authLoading = false;

  // Existing state
  const [item, setItem] = useState<AirlockItemWithUrl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileItems, setMobileItems] = useState<AirlockItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AirlockItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detect Mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch Item (Existing Logic)
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

    /* MOCK DATA
    setItem({
        id: 'mock-id',
        asset_id: 'a1',
        file_path: 'mock.pdf',
        status: 'REVIEW_NEEDED',
        ai_payload: { transactions: [{ date: '2023-01-01', description: 'Mock Tx', amount: 100 }] },
        confidence_score: 0.9,
        traffic_light: 'YELLOW',
        created_at: '',
        url: null,
        contact_id: null
    } as any);
    setLoading(false);
    */
  }, [id, session, authLoading]);

  // Fetch Mobile Queue (List)
  useEffect(() => {
    if (!isMobile || !item?.asset_id || !session) return;

    const fetchQueue = async () => {
      try {
        const res = await fetch(`/api/airlock?asset_id=${item.asset_id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setMobileItems(data);
        }
      } catch (err) {
        console.error('Failed to fetch queue:', err);
      }
    };

    fetchQueue();

  }, [isMobile, item?.asset_id, session]);

  const handleItemClick = (clickedItem: AirlockItem) => {
    setSelectedItem(clickedItem);
    setIsModalOpen(true);
  };

  const handleModalSave = async (data: any) => {
    console.log('Saving data:', data);
    // TODO: Implement actual save logic (PUT /api/airlock/[id])
    // Mock save delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update local state (optimistic update)
    if (selectedItem) {
        const updatedItem = {
            ...selectedItem,
            ai_payload: { transactions: data }
        };
        // Update item in list
        setMobileItems(prev => prev.map(i => i.id === selectedItem.id ? updatedItem : i));
        // Update current item if it's the one we're viewing
        if (item?.id === selectedItem.id) {
            setItem(prev => prev ? { ...prev, ai_payload: { transactions: data } } : null);
        }
    }
  };

  const handleApproveItem = async (itemId: string) => {
    if (!session) return;
    const res = await fetch('/api/airlock/commit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: itemId }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve item');
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setMobileItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleContactChange = async (contactId: string | null) => {
      if (!item) return;

      const supabase = createClient();
      const { error } = await supabase
        .from('airlock_items')
        .update({ contact_id: contactId })
        .eq('id', item.id);

      if (error) {
          console.error('Failed to update contact:', error);
          // Ideally show a toast
      } else {
          console.log('Contact updated to:', contactId);
      }
  };

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

  // Render Mobile View
  if (isMobile) {
    return (
      <Shell>
        <AirlockMobileList
          items={mobileItems}
          onItemClick={handleItemClick}
          onApprove={handleApproveItem}
          onRemove={handleRemoveItem}
        />
        <AirlockMobileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={selectedItem}
          onSave={handleModalSave}
        />
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
            confidence={item?.confidence_score ?? 0}
            assetId={item?.asset_id}
            contactId={item?.contact_id}
            onContactChange={handleContactChange}
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
