'use client';

import React, { useState } from 'react';
import { Button } from '@/src/components/common/Button';
import { Plus } from 'lucide-react';
import { ManualTransactionModal } from '@/src/components/ledger/ManualTransactionModal';
import { Asset } from '@/lib/types';

interface LedgerHeaderProps {
  assets?: Pick<Asset, 'id' | 'name' | 'currency'>[];
}

export function LedgerHeader({ assets = [] }: LedgerHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddTransaction = () => {
    setIsModalOpen(true);
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

      <ManualTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assets={assets}
      />
    </div>
  );
}
