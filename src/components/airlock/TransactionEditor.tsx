'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { ExtractedData } from '@/lib/ai/types';
import { useTransactionValidator } from '@/src/hooks/useTransactionValidator';
import { SimpleToast } from '@/src/components/common/SimpleToast';

export interface TransactionRow extends Omit<ExtractedData, 'amount'> {
  id: string; // Unique ID for React keys
  category?: string;
  amount: string | number;
}

interface TransactionEditorProps {
  initialData: { transactions: ExtractedData[] } | Record<string, any> | null;
  confidence?: number;
  onSave?: (data: any) => void;
  onChange?: (data: TransactionRow[]) => void;
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

export function TransactionEditor({ initialData, confidence = 0, onSave, onChange }: TransactionEditorProps) {
  const [rows, setRows] = useState<TransactionRow[]>(() => initializeRows(initialData));
  const [isEdited, setIsEdited] = useState(false);
  const { status, errors } = useTransactionValidator(rows, confidence, isEdited);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Notify parent of changes
  useEffect(() => {
    onChange?.(rows);
  }, [rows, onChange]);

  // Handle Validation Feedback
  useEffect(() => {
    if (status === 'RED' && isEdited) {
      setToastMessage(errors[0] || 'Validation failed');
      setShowToast(true);
    }
  }, [status, isEdited, errors]);

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
    setIsEdited(true);
  };

  const handleRemove = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
    setIsEdited(true);
  };

  const handleChange = (id: string, field: keyof TransactionRow, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        return { ...row, [field]: value };
      }
      return row;
    }));
    setIsEdited(true);
  };

  const net = rows.reduce((sum, r) => {
      const val = parseFloat(r.amount.toString());
      return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const StatusBadge = () => {
    let color = 'bg-gray-100 text-gray-800 border-gray-200';
    let Icon = CheckCircle;
    let text = 'Unknown';

    if (status === 'GREEN') {
      color = 'bg-green-100 text-green-800 border-green-200';
      Icon = CheckCircle;
      text = 'Valid';
    } else if (status === 'YELLOW') {
      color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
      Icon = AlertTriangle;
      text = 'Review Needed';
    } else if (status === 'RED') {
      color = 'bg-red-100 text-red-800 border-red-200';
      Icon = AlertCircle;
      text = 'Error';
    }

    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
        <Icon size={14} />
        <span>{text}</span>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col bg-white relative ${status === 'RED' && isEdited ? 'shake' : ''}`}>
      {showToast && (
        <SimpleToast
          message={toastMessage}
          type="error"
          onClose={() => setShowToast(false)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Transaction Editor</h2>
          <StatusBadge />
        </div>
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
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">
                <div className="col-span-3">Date</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1"></div>
            </div>

            {rows.map((row) => (
            <div key={row.id} className="flex flex-col md:grid md:grid-cols-12 gap-2 items-start md:items-center bg-white border border-gray-200 p-4 md:p-2 hover:border-gray-400 transition-colors group">
                <div className="w-full md:col-span-3">
                <input
                    type="date"
                    value={row.date as string}
                    onChange={(e) => handleChange(row.id, 'date', e.target.value)}
                    className="w-full text-sm font-mono border-none focus:ring-0 p-0 bg-transparent outline-none"
                    aria-label="Date"
                />
                </div>
                <div className="w-full md:col-span-4">
                <input
                    type="text"
                    value={row.description}
                    onChange={(e) => handleChange(row.id, 'description', e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 outline-none"
                    placeholder="Description"
                    aria-label="Description"
                />
                </div>
                <div className="w-full md:col-span-2">
                <input
                    type="number"
                    value={row.amount}
                    onChange={(e) => handleChange(row.id, 'amount', e.target.value)}
                    className="w-full text-sm font-mono text-left md:text-right border-none focus:ring-0 p-0 bg-transparent outline-none"
                    step="0.01"
                    aria-label="Amount"
                    placeholder="0.00"
                />
                </div>
                <div className="w-full md:col-span-2">
                <input
                    type="text"
                    value={row.category || ''}
                    onChange={(e) => handleChange(row.id, 'category', e.target.value)}
                    className="w-full text-sm border-none focus:ring-0 p-0 bg-transparent placeholder-gray-300 outline-none"
                    placeholder="Category"
                    aria-label="Category"
                />
                </div>
                <div className="w-full flex justify-end md:col-span-1 md:justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
