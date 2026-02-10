'use client';

import React from 'react';
import { GhostEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';
import { Button } from '@/src/components/common/Button';
import { Calendar, AlertCircle, Check, X } from 'lucide-react';

interface LedgerHorizonProps {
  ghostEntries: GhostEntry[];
}

export function LedgerHorizon({ ghostEntries }: LedgerHorizonProps) {
  if (!ghostEntries || ghostEntries.length === 0) {
    return (
      <div className="bg-[#FAFAFA] border-b border-zinc-200 p-8 flex flex-col items-center justify-center text-zinc-400 gap-2 mb-8">
        <Calendar className="w-8 h-8 opacity-20" />
        <p className="text-sm font-medium">No projected events on the horizon.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] border-b-4 border-black mb-0">
      <div className="px-6 py-3 border-b border-zinc-200 flex items-center justify-between">
        <h2 className="text-xs font-bold tracking-widest uppercase text-zinc-500 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          The Horizon
        </h2>
        <span className="text-xs font-mono text-zinc-400">{ghostEntries.length} PENDING</span>
      </div>

      <div className="flex flex-col">
        {ghostEntries.map((entry) => {
          const isOverdue = entry.status === 'OVERDUE';

          return (
            <div
              key={entry.id}
              className={`
                group flex flex-col md:flex-row md:items-center justify-between p-4 border-b border-zinc-200 last:border-b-0 transition-colors hover:bg-white
                ${isOverdue ? 'border-l-[2px] border-l-[#D0021B] bg-red-50/10' : 'pl-4 border-l-[2px] border-l-transparent'}
              `}
            >
              {/* Left: Date & Description */}
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex flex-col min-w-[120px]">
                  <span className={`text-sm font-mono tabular-nums ${isOverdue ? 'text-[#D0021B] font-bold' : 'text-zinc-500'}`}>
                    {new Date(entry.expected_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {isOverdue && (
                    <span className="flex items-center text-[10px] font-bold text-[#D0021B] uppercase tracking-wider mt-1">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Overdue
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="font-medium text-[#111111] text-base">{entry.description}</span>
                  <span className="text-xs text-zinc-400 uppercase tracking-wide mt-0.5">
                    {entry.asset?.name || 'Unknown Asset'}
                  </span>
                </div>
              </div>

              {/* Right: Amount & Actions */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mt-4 md:mt-0">
                <span className="font-mono text-lg font-medium text-[#111111] tabular-nums">
                  {formatCurrency(Number(entry.expected_amount), entry.asset?.currency || 'USD', 'en-US')}
                </span>

                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-white hover:bg-zinc-50 border-zinc-200"
                    onClick={() => alert(`Match ${entry.id}`)}
                    icon={<Check className="w-3 h-3" />}
                  >
                    Match
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => alert(`Void ${entry.id}`)}
                    icon={<X className="w-3 h-3" />}
                  >
                    Void
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
