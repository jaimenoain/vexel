import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { AirlockItem } from '@/lib/types';
import { TransactionEditor, TransactionRow } from './TransactionEditor';

interface AirlockMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AirlockItem | null;
  onSave: (data: TransactionRow[]) => Promise<void>;
}

export function AirlockMobileModal({ isOpen, onClose, item, onSave }: AirlockMobileModalProps) {
  const [editedData, setEditedData] = useState<TransactionRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when item changes or modal opens
  useEffect(() => {
    if (!isOpen || !item) {
      setEditedData([]);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSaveClick = async () => {
    setIsSaving(true);
    try {
      await onSave(editedData);
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      // Ideally show toast or alert
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col h-full w-full animate-in slide-in-from-bottom duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold">Edit Transaction</h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-700 active:bg-gray-100 rounded-full"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
      </div>

      {/* Body - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <TransactionEditor
          key={item.id} // Force re-mount when item changes or modal re-opens
          initialData={item.ai_payload}
          confidence={item.confidence_score ?? 0}
          onChange={setEditedData}
          assetId={item.asset_id}
        />
      </div>

      {/* Footer - Pinned Button */}
      <div className="p-4 pb-8 border-t border-gray-200 bg-white">
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="w-full bg-black text-white font-medium py-3.5 rounded-xl flex items-center justify-center gap-2 active:bg-gray-800 disabled:opacity-50 shadow-lg transition-all"
        >
          {isSaving ? (
            <span>Saving...</span>
          ) : (
            <>
              <Save size={20} />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
