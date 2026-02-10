'use client';

import { useState, useMemo } from 'react';
import { LedgerTransactionWithLines } from '@/lib/types';
import { processLedgerTransactions, LedgerRow } from './ledger-utils';
import { formatCurrency } from '@/lib/formatting';
import { ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface LedgerHistoryProps {
  transactions: LedgerTransactionWithLines[];
  initialBalance: number;
}

export function LedgerHistory({ transactions, initialBalance }: LedgerHistoryProps) {
  const rows = useMemo(() => processLedgerTransactions(transactions, initialBalance), [transactions, initialBalance]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedGroups(newSet);
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
       {/* Desktop Table View */}
       <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
                <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">In</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Out</th>
                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                </tr>
             </thead>
             <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                   <RowItem key={row.id} row={row} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />
                ))}
             </tbody>
          </table>
       </div>

       {/* Mobile Card View */}
       <div className="md:hidden space-y-3 p-4 bg-gray-50 min-h-screen">
          {rows.map((row) => (
             <MobileCard key={row.id} row={row} expandedGroups={expandedGroups} toggleGroup={toggleGroup} />
          ))}
       </div>
    </div>
  );
}

function RowItem({ row, expandedGroups, toggleGroup }: { row: LedgerRow; expandedGroups: Set<string>; toggleGroup: (id: string) => void }) {
  const isExpanded = expandedGroups.has(row.id);
  const isGroup = row.isGroup;

  return (
    <>
      <tr
        className={clsx(
           "hover:bg-gray-50 transition-colors",
           isGroup && "cursor-pointer bg-gray-50/50"
        )}
        onClick={() => isGroup && toggleGroup(row.id)}
      >
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
           {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
           <div className="flex items-center gap-2">
              {isGroup && (
                 isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <span className={clsx(isGroup && "font-medium")}>{row.description}</span>
           </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
           {row.category}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700 text-right font-mono">
           {row.inAmount > 0 ? formatCurrency(row.inAmount, 'USD', 'en-US') : ''}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
           {row.outAmount > 0 ? formatCurrency(row.outAmount, 'USD', 'en-US') : ''}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono font-medium">
           {formatCurrency(row.balance, 'USD', 'en-US')}
        </td>
      </tr>
      {isGroup && isExpanded && row.groupItems?.map((item) => (
         <tr key={item.id} className="bg-gray-50">
            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500 font-mono pl-12 border-l-4 border-l-gray-300">
               {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </td>
            <td className="px-6 py-3 text-xs text-gray-600">
               {item.description}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-500">
               {item.category}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-xs text-green-700 text-right font-mono">
               {item.inAmount > 0 ? formatCurrency(item.inAmount, 'USD', 'en-US') : ''}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-600 text-right font-mono">
               {item.outAmount > 0 ? formatCurrency(item.outAmount, 'USD', 'en-US') : ''}
            </td>
            <td className="px-6 py-3 whitespace-nowrap text-xs text-gray-400 text-right font-mono">
               {formatCurrency(item.balance, 'USD', 'en-US')}
            </td>
         </tr>
      ))}
    </>
  );
}

function MobileCard({ row, expandedGroups, toggleGroup }: { row: LedgerRow; expandedGroups: Set<string>; toggleGroup: (id: string) => void }) {
  const isExpanded = expandedGroups.has(row.id);
  const isGroup = row.isGroup;

  return (
    <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
      <div
        className={clsx("p-4", isGroup && "cursor-pointer")}
        onClick={() => isGroup && toggleGroup(row.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
             {isGroup && (
                isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
             )}
             <span className="font-medium text-gray-900 text-sm">{row.description}</span>
          </div>
          <span className="text-xs font-mono text-gray-500">
            {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
           <span className="text-gray-500 text-xs">{row.category}</span>
           <div className="flex flex-col items-end">
              <span className={clsx("font-mono font-medium", row.inAmount > 0 ? "text-green-700" : "text-gray-900")}>
                 {row.inAmount > 0 ? `+${formatCurrency(row.inAmount, 'USD', 'en-US')}` : `-${formatCurrency(row.outAmount, 'USD', 'en-US')}`}
              </span>
              <span className="text-xs text-gray-400 font-mono mt-1">
                 Bal: {formatCurrency(row.balance, 'USD', 'en-US')}
              </span>
           </div>
        </div>
      </div>

      {isGroup && isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {row.groupItems?.map((item) => (
             <div key={item.id} className="p-3 pl-8 border-b border-gray-100 last:border-0 text-xs">
                <div className="flex justify-between mb-1">
                   <span className="text-gray-600">{item.description}</span>
                   <span className="font-mono text-gray-500">
                     {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
                </div>
                <div className="flex justify-between">
                   <span className="text-gray-400">{item.category}</span>
                   <span className="font-mono text-gray-600">
                     {item.inAmount > 0 ? `+${formatCurrency(item.inAmount, 'USD', 'en-US')}` : `-${formatCurrency(item.outAmount, 'USD', 'en-US')}`}
                   </span>
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
