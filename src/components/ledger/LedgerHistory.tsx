'use client';

import React, { useState } from 'react';
import { LedgerTransaction, LedgerViewItem, GroupedTransaction } from '@/lib/types';
import { groupTransactions, getTransactionDisplayData } from '@/lib/ledger/transformers';
import { formatCurrency } from '@/lib/formatting';
import { ChevronRight, ChevronDown, Upload } from 'lucide-react';
import { Button } from '@/src/components/common/Button';
import { useRouter } from 'next/navigation';

interface LedgerHistoryProps {
  transactions: LedgerTransaction[];
}

export function LedgerHistory({ transactions }: LedgerHistoryProps) {
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const viewItems = groupTransactions(transactions);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Helper to format currency
  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '';
    return formatCurrency(amount, 'USD', 'en-US');
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white py-16 px-6 text-center border border-zinc-100 rounded-sm flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2">
            <h3 className="text-lg font-medium text-zinc-900">No transaction history</h3>
            <p className="text-sm text-zinc-500 max-w-sm">
                Get started by importing your data via Airlock.
            </p>
        </div>
        <Button
            onClick={() => router.push('/airlock')}
            icon={<Upload className="w-4 h-4" />}
            variant="primary"
            size="md"
        >
            Upload CSV via Airlock
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-zinc-200">
      {/* Mobile View: Stacked Cards */}
      <div className="md:hidden flex flex-col">
        {viewItems.map((item) => {
          const data = getTransactionDisplayData(item);
          const isGroup = 'items' in item;
          const isExpanded = isGroup && expandedGroups[item.id];

          return (
            <div key={item.id} className="border-b border-zinc-100 p-4 hover:bg-zinc-50 transition-colors">
              <div
                className={`flex flex-col gap-2 ${isGroup ? 'cursor-pointer' : ''}`}
                onClick={isGroup ? () => toggleGroup(item.id) : undefined}
              >
                <div className="flex justify-between items-start">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
                        {new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="font-medium text-[#111111] flex items-center gap-2 mt-0.5">
                        {isGroup && (
                            <span className="text-zinc-400">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </span>
                        )}
                        {data.description}
                      </span>
                   </div>
                   <div className="flex flex-col items-end">
                      {data.inAmount && (
                          <span className="font-mono text-[#10893E] font-medium">{formatAmount(data.inAmount)}</span>
                      )}
                      {data.outAmount && (
                          <span className="font-mono text-[#111111] font-medium">{formatAmount(data.outAmount)}</span>
                      )}
                   </div>
                </div>
                <div className="text-xs text-zinc-400 truncate max-w-[200px]">
                  {data.category}
                </div>
              </div>

              {/* Expanded Mobile Group */}
              {isGroup && isExpanded && (
                <div className="mt-3 pl-3 border-l-2 border-zinc-100 flex flex-col gap-3 pt-2">
                   {(item as GroupedTransaction).items.map((subItem) => {
                      const subData = getTransactionDisplayData(subItem);
                      return (
                        <div key={subItem.id} className="flex flex-col gap-1">
                           <div className="flex justify-between text-sm">
                              <span className="text-zinc-600">{subData.description}</span>
                              <div className="flex flex-col items-end text-xs font-mono">
                                {subData.inAmount && <span className="text-[#10893E]">{formatAmount(subData.inAmount)}</span>}
                                {subData.outAmount && <span className="text-zinc-600">{formatAmount(subData.outAmount)}</span>}
                              </div>
                           </div>
                           <span className="text-[10px] text-zinc-400">{subData.category}</span>
                        </div>
                      );
                   })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/50">
              <th className="py-3 px-4 w-[140px] font-sans">Date</th>
              <th className="py-3 px-4 font-sans">Description</th>
              <th className="py-3 px-4 w-[200px] font-sans">Category</th>
              <th className="py-3 px-4 text-right w-[120px] font-sans">In</th>
              <th className="py-3 px-4 text-right w-[120px] font-sans">Out</th>
              <th className="py-3 px-4 text-right w-[120px] font-sans">Balance</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {viewItems.map((item) => {
              const data = getTransactionDisplayData(item);
              const isGroup = 'items' in item;
              const isExpanded = isGroup && expandedGroups[item.id];

              return (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <tr
                    className={`
                      border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50 transition-colors
                      ${isGroup ? 'cursor-pointer select-none' : ''}
                      ${isExpanded ? 'bg-zinc-50' : ''}
                    `}
                    onClick={isGroup ? () => toggleGroup(item.id) : undefined}
                  >
                    <td className="py-4 px-4 font-mono text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 font-medium text-[#111111] flex items-center gap-2">
                      {isGroup && (
                        <span className="text-zinc-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </span>
                      )}
                      {data.description}
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-500 truncate max-w-[200px]" title={data.category}>
                      {data.category}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[#10893E]">
                      {data.inAmount ? formatAmount(data.inAmount) : ''}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-[#111111]">
                      {data.outAmount ? formatAmount(data.outAmount) : ''}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-zinc-400 text-xs">
                      -
                    </td>
                  </tr>

                  {/* Expanded Group Rows */}
                  {isGroup && isExpanded && (
                    <tr className="bg-zinc-50/50 shadow-inner">
                      <td colSpan={6} className="p-0 border-b border-zinc-100">
                        <table className="w-full">
                          <tbody>
                            {(item as GroupedTransaction).items.map((subItem: LedgerTransaction) => {
                                const subData = getTransactionDisplayData(subItem);
                                return (
                                  <tr key={subItem.id} className="border-b border-zinc-100/50 last:border-b-0 hover:bg-white/50">
                                    <td className="py-2 px-4 w-[140px] font-mono text-[10px] text-zinc-400 pl-8">
                                      {new Date(subData.date).toLocaleDateString()}
                                    </td>
                                    <td className="py-2 px-4 text-xs text-zinc-600 pl-12 font-medium">
                                      {subData.description}
                                    </td>
                                    <td className="py-2 px-4 w-[200px] text-[10px] text-zinc-400">
                                      {subData.category}
                                    </td>
                                    <td className="py-2 px-4 text-right w-[120px] font-mono text-[10px] text-[#10893E]">
                                        {subData.inAmount ? formatAmount(subData.inAmount) : ''}
                                    </td>
                                    <td className="py-2 px-4 text-right w-[120px] font-mono text-[10px] text-zinc-600">
                                        {subData.outAmount ? formatAmount(subData.outAmount) : ''}
                                    </td>
                                    <td className="py-2 px-4 w-[120px]"></td>
                                  </tr>
                                );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
