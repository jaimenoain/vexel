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
}

export function AirlockMobileList({ items, onItemClick, onApprove, onRemove, onUpload }: AirlockMobileListProps) {
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
