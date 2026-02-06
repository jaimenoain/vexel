import React from 'react';
import { AirlockItem } from '@/lib/types';
import { AirlockMobileCard } from './AirlockMobileCard';

interface AirlockMobileListProps {
  items: AirlockItem[];
  onItemClick: (item: AirlockItem) => void;
}

export function AirlockMobileList({ items, onItemClick }: AirlockMobileListProps) {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>No items in the queue.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-full pb-24">
      {items.map((item) => (
        <AirlockMobileCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
        />
      ))}
    </div>
  );
}
