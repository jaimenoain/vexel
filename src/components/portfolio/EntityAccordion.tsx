'use client';

import { useState } from 'react';
import { Entity } from '@/lib/types';
import { ChevronRight } from 'lucide-react';
import { AssetRow } from './AssetRow';
import clsx from 'clsx';

export function EntityAccordion({ entity }: { entity: Entity }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#E5E5E5]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-4 hover:bg-[#FAFAFA] transition-colors text-left"
        data-testid="entity-accordion-button"
      >
        <span className="font-medium text-[#111111]">{entity.name}</span>
        <ChevronRight
          size={16}
          className={clsx("text-[#111111] transition-transform duration-200", {
            "rotate-90": isOpen,
          })}
        />
      </button>
      {isOpen && (
        <div className="bg-white">
          {entity.assets.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
          {entity.assets.length === 0 && (
            <div className="py-3 pl-8 pr-4 text-sm text-gray-400 italic">
              No assets
            </div>
          )}
        </div>
      )}
    </div>
  );
}
