import React, { useState } from 'react';
import { AirlockItem, TrafficLight } from '@/lib/types';
import { Check, Loader2 } from 'lucide-react';

interface AirlockMobileCardProps {
  item: AirlockItem;
  onClick: () => void;
  onApprove: (id: string) => Promise<void>;
  onRemove: (id: string) => void;
}

const getStatusColor = (status: TrafficLight | null) => {
  switch (status) {
    case 'GREEN': return 'bg-green-100 text-green-800 border-green-200';
    case 'YELLOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'RED': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getVendorName = (item: AirlockItem): string => {
  // Try to find first transaction description or counterparty
  const transactions = item.ai_payload?.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    return transactions[0].counterparty || transactions[0].description || 'Unknown Vendor';
  }
  return 'Unknown Vendor';
};

const getAmount = (item: AirlockItem): string => {
  const transactions = item.ai_payload?.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const total = transactions.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0);
    return total.toFixed(2);
  }
  return '0.00';
};

const getDate = (item: AirlockItem): string => {
  const transactions = item.ai_payload?.transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const dateStr = transactions[0].date;
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : date.toLocaleDateString();
  }
  return '';
};

export function AirlockMobileCard({ item, onClick, onApprove, onRemove }: AirlockMobileCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const statusColor = getStatusColor(item.traffic_light);
  const vendor = getVendorName(item);
  const amount = getAmount(item);
  const date = getDate(item);

  const handleApproveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isApproving || item.traffic_light === 'RED') return;

    setIsApproving(true);
    try {
      await onApprove(item.id);
      setIsExiting(true);
      // Wait for animation to complete before removing from list
      setTimeout(() => {
        onRemove(item.id);
      }, 300);
    } catch (error) {
      console.error('Approve failed', error);
      setIsApproving(false);
    }
  };

  const isActionable = item.traffic_light !== 'RED';

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 active:scale-[0.98] transition-all duration-300 ease-in-out cursor-pointer ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 truncate pr-2">{vendor}</h3>
      </div>

      <div className="flex justify-between items-center mb-3 text-sm text-gray-600">
        <span>{date}</span>
        <span className="font-mono font-medium text-gray-900">{amount}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColor}`}>
          {item.traffic_light || 'PENDING'}
        </span>

        <button
          onClick={handleApproveClick}
          disabled={!isActionable || isApproving}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-colors
            ${
              !isActionable
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-green-100 text-green-700 hover:bg-green-200 active:bg-green-300'
            }
          `}
          aria-label="Approve"
          title={!isActionable ? "Cannot approve items with RED status" : "Approve"}
        >
          {isApproving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        </button>
      </div>
    </div>
  );
}
