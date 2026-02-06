'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ExtractedData } from '@/lib/ai/types';

interface TransactionRow extends Omit<ExtractedData, 'amount'> {
  id: string; // Unique ID for React keys
  category?: string;
  amount: string | number;
}

interface TransactionEditorProps {
  initialData: { transactions: ExtractedData[] } | Record<string, any> | null;
  onSave?: (data: any) => void;
}

const initializeRows = (data: TransactionEditorProps['initialData']): TransactionRow[] => {
    if (data && 'transactions' in data && Array.isArray(data.transactions)) {
      return data.transactions.map((tx: ExtractedData, index: number) => ({
        ...tx,
        id: `tx-${Date.now()}-${index}`,
        category: '', // Default empty category
        // Normalize date to YYYY-MM-DD for input[type="date"]
        date: tx.date instanceof Date
          ? tx.date.toISOString().split('T')[0]
          : (typeof tx.date === 'string' ? tx.date.split('T')[0] : ''),
        amount: tx.amount
      }));
    }
    return [];
};

export function TransactionEditor({ initialData, onSave }: TransactionEditorProps) {
  const [rows, setRows] = useState<TransactionRow[]>(() => initializeRows(initialData));

  const handleAddSplit = () => {
    const newRow: TransactionRow = {
      id: `tx-${Date.now()}-${rows.length}`,
      date: new Date().toISOString().split('T')[0],
      amount: '', // Start empty
      currency: 'USD',
      description: '',
      category: '',
      confidence: 1.0, // Manual entry implies high confidence
    };
    setRows([...rows, newRow]);
  };

  const handleRemove = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleChange = (id: string, field: keyof TransactionRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const net = rows.reduce((sum, r) => {
      const val = parseFloat(r.amount.toString());
      return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Transaction Editor</h2>
        <button
          onClick={handleAddSplit}
          className="flex items-center gap-2 text-sm font-medium bg-black text-white px-3 py-1.5 hover:bg-gray-800 transition-colors"
          data-testid="add-split-btn"
        >
          <Plus size={16} />
          Add Split
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
            {/* Header Row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                <div className="col-span-3">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1"></div>
            </div>

            {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-gray-200 p-2 hover:border-gray-400 transition-colors group">
                <div className="col-span-3">
                <input
                    type="date"
                    value={row.date as string}
                    onChange={(e) => handleChange(row.id, 'date', e.target.value)}
                    className="w-full text-sm font-mono border-none focus:ring-0 p-0 bg-transparent outline-none"
                    aria-label="Date"
                />
                </div>
                <div className="col-span-4">
                <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleChange(row.id, 'description', e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 outline-none"
                    placeholder="Description"
                    aria-label="Description"
                />
                </div>
                <div className="col-span-2">
                <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => handleChange(row.id, 'amount', e.target.value)}
                    className="w-full text-sm font-mono text-right border-none focus:ring-0 p-0 bg-transparent outline-none"
                    step="0.01"
                    aria-label="Amount"
                />
                </div>
                <div className="col-span-2">
                <input
                    type="text"
                    value={row.category || ''}
                    onChange={(e) => handleChange(row.id, 'category', e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 outline-none"
                    placeholder="Category"
                    aria-label="Category"
                />
                </div>
                <div className="col-span-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => handleRemove(row.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Remove row"
                    aria-label="Remove row"
                >
                    <Trash2 size={14} />
                </button>
                </div>
            </div>
            ))}

            {rows.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                    No transactions found. Add a split to start.
                </div>
            )}
        </div>
      </div>
       {/* Footer / Status */}
       <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
            <span>{rows.length} transaction{rows.length !== 1 ? 's' : ''}</span>
            <span>Net: {net.toFixed(2)}</span>
       </div>
    </div>
  );
}
