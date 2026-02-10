'use client';

import React from 'react';
import { Button } from '@/src/components/common/Button';
import { Plus } from 'lucide-react';

export function LedgerHeader() {
  const handleAddTransaction = () => {
    alert('Not implemented yet');
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Ledger</h1>
      <Button
        onClick={handleAddTransaction}
        icon={<Plus className="h-4 w-4" />}
        size="sm"
      >
        Add Transaction
      </Button>
    </div>
  );
}
