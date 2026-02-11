'use client';

import React, { useState } from 'react';
import { Modal } from '@/src/components/common/Modal';
import { Button } from '@/src/components/common/Button';
import { Asset, Contact } from '@/lib/types';
import { addTransaction } from '@/app/ledger/actions';
import { Loader2 } from 'lucide-react';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Pick<Asset, 'id' | 'name' | 'currency'>[];
  contacts?: Contact[];
}

export function ManualTransactionModal({ isOpen, onClose, assets, contacts = [] }: ManualTransactionModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await addTransaction(null, formData);

    setIsSubmitting(false);

    if (result?.success) {
      onClose();
      // Reset form on next open
      (event.target as HTMLFormElement).reset();
    } else {
      setError(result?.error || 'An error occurred');
    }
  }

  const defaultDate = new Date().toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Manual Transaction">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-zinc-700">
            Date
          </label>
          <input
            type="date"
            name="date"
            id="date"
            defaultValue={defaultDate}
            required
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent font-mono"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-zinc-700">
            Description
          </label>
          <input
            type="text"
            name="description"
            id="description"
            placeholder="e.g. Office Supplies"
            required
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-sm font-medium text-zinc-700">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            id="amount"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Contact (Payee/Payer) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contactId" className="text-sm font-medium text-zinc-700">
            Payee / Payer
          </label>
          <select
            name="contactId"
            id="contactId"
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent appearance-none bg-white"
            defaultValue=""
          >
            <option value="">None</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} {contact.role ? `(${contact.role})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Source (Credit) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sourceAssetId" className="text-sm font-medium text-zinc-700">
            Source (Credit)
          </label>
          <select
            name="sourceAssetId"
            id="sourceAssetId"
            required
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent appearance-none bg-white"
            defaultValue=""
          >
            <option value="" disabled>Select Source Asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.currency})
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">Where the money comes from (e.g. Bank).</p>
        </div>

        {/* Destination (Debit) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="destAssetId" className="text-sm font-medium text-zinc-700">
            Destination (Debit)
          </label>
          <select
            name="destAssetId"
            id="destAssetId"
            required
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent appearance-none bg-white"
            defaultValue=""
          >
             <option value="" disabled>Select Destination Asset</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.currency})
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">Where the money goes (e.g. Expense).</p>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Transaction'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
