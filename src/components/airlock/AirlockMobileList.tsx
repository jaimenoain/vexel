import React, { useState } from 'react';
import { AirlockItem } from '@/lib/types';
import { AirlockMobileCard } from './AirlockMobileCard';
import { Check, Edit, Loader2, ShieldCheck } from 'lucide-react';

interface AirlockMobileListProps {
  items: AirlockItem[];
  onItemClick: (item: AirlockItem) => void;
  onApprove: (id: string) => Promise<void>;
  onRemove: (id: string) => void;
  onUpload?: () => void;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div
      data-testid="skeleton-card"
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 animate-pulse"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      <div className="flex justify-between items-center">
        <div className="h-3 w-3 rounded-full bg-gray-200"></div>
      </div>
    </div>
  );
}

export function AirlockMobileList({ items, onItemClick, onApprove, onRemove, onUpload, isLoading }: AirlockMobileListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  const handleApprove = async () => {
    if (!selectedId || processingId) return;

    const currentId = selectedId;
    setProcessingId(currentId);

    try {
      await onApprove(currentId);

      // Start exit animation
      setExitingIds(prev => {
        const next = new Set(prev);
        next.add(currentId);
        return next;
      });

      // Wait for animation
      setTimeout(() => {
        onRemove(currentId);
        setExitingIds(prev => {
          const next = new Set(prev);
          next.delete(currentId);
          return next;
        });
        setProcessingId(null);
        if (selectedId === currentId) {
          setSelectedId(null);
        }
      }, 300);

    } catch (error) {
      console.error('Approve failed', error);
      setProcessingId(null);
    }
  };

  const selectedItem = items.find(i => i.id === selectedId);
  const isActionable = selectedItem && selectedItem.traffic_light !== 'RED';

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-full pb-32">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium mb-6">All Systems Nominal. No pending data.</p>
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors"
        >
          Upload Document
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-full pb-32">
      <div className="p-4">
        {items.map((item) => (
          <AirlockMobileCard
            key={item.id}
            item={item}
            onClick={() => setSelectedId(prev => prev === item.id ? null : item.id)}
            isSelected={selectedId === item.id}
            isExiting={exitingIds.has(item.id)}
          />
        ))}
      </div>

      {/* Fixed Action Bar */}
      <div
        data-testid="action-bar"
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transform transition-transform duration-300 z-[60] ${
          selectedId ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={() => selectedItem && onItemClick(selectedItem)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 font-medium text-gray-700 active:bg-gray-50 transition-colors"
          >
            <Edit size={20} />
            <span>Edit</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={!isActionable || !!processingId}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white transition-colors ${
              !isActionable
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-black active:bg-gray-800'
            }`}
          >
            {processingId ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            <span>Approve</span>
          </button>
        </div>
      </div>
    </div>
  );
}
