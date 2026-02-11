'use client';

import React, { useState } from 'react';
import { Button } from '@/src/components/common/Button';
import { Plus, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ManualTransactionModal } from '@/src/components/ledger/ManualTransactionModal';
import { Asset, Contact } from '@/lib/types';

interface LedgerHeaderProps {
  assets?: Pick<Asset, 'id' | 'name' | 'currency'>[];
  contacts?: Contact[];
}

export function LedgerHeader({ assets = [], contacts = [] }: LedgerHeaderProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddTransaction = () => {
    setIsModalOpen(true);
  };

  const handleImportCSV = () => {
    router.push('/airlock');
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Ledger</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleImportCSV}
          icon={<Upload className="h-4 w-4" />}
          size="sm"
        >
          Import CSV
        </Button>
        <Button
          onClick={handleAddTransaction}
          icon={<Plus className="h-4 w-4" />}
          size="sm"
        >
          Add Transaction
        </Button>
      </div>

      <ManualTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assets={assets}
        contacts={contacts}
      />
    </div>
  );
}
