import React from 'react';
import { AirlockItem, TrafficLight } from '@/lib/types';

interface AirlockMobileCardProps {
  item: AirlockItem;
  onClick: () => void;
  isSelected?: boolean;
  isExiting?: boolean;
}

const getStatusColor = (status: TrafficLight | null) => {
  switch (status) {
    case 'GREEN': return 'bg-[#10893E]';
    case 'YELLOW': return 'bg-[#F5A623]';
    case 'RED': return 'bg-[#D0021B]';
    default: return 'bg-gray-300';
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

export function AirlockMobileCard({ item, onClick, isSelected, isExiting }: AirlockMobileCardProps) {
  const statusColor = getStatusColor(item.traffic_light);
  const vendor = getVendorName(item);
  const amount = getAmount(item);
  const date = getDate(item);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border p-4 mb-3 active:scale-[0.98] transition-all duration-300 ease-in-out cursor-pointer ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      } ${
        isSelected ? 'border-black ring-1 ring-black' : 'border-gray-200'
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
        <div
          data-testid="status-indicator"
          className={`h-3 w-3 rounded-full ${statusColor}`}
        />
      </div>
    </div>
  );
}
