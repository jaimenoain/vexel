import React from 'react';
import { GhostEntry } from '@/lib/types';
import { formatCurrency } from '@/lib/formatting';
import clsx from 'clsx';

interface LedgerHorizonProps {
  ghosts: GhostEntry[];
}

export function LedgerHorizon({ ghosts }: LedgerHorizonProps) {
  if (!ghosts || ghosts.length === 0) {
    return (
      <div className="hidden">
        {/* Hidden when empty as per requirements */}
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] border-b-4 border-black pb-6 pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">The Horizon</h2>
        <div className="space-y-2">
          {ghosts.map((ghost) => {
            const isOverdue = ghost.status === 'OVERDUE';
            return (
              <div
                key={ghost.id}
                className={clsx(
                  "flex items-center justify-between p-4 bg-white shadow-sm border border-gray-200 rounded-sm transition-all hover:shadow-md",
                  isOverdue && "border-l-[2px] border-l-red-600"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 flex-1">
                  <div className="flex flex-col min-w-[120px]">
                     <span className={clsx("text-sm font-mono", isOverdue ? "text-red-600 font-bold" : "text-gray-500")}>
                        {new Date(ghost.expected_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                     </span>
                     {isOverdue && (
                        <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider mt-0.5">Overdue</span>
                     )}
                  </div>
                  <div className="flex-1">
                     <span className="text-sm font-medium text-gray-900 block">{ghost.description}</span>
                     {ghost.recurrence_rule && (
                        <span className="text-xs text-gray-400 block mt-0.5">Recurring</span>
                     )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {formatCurrency(ghost.expected_amount, 'USD', 'en-US')}
                  </span>

                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors">
                      Match
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 focus:outline-none transition-colors">
                      Void
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
