'use client';

import React, { useState } from 'react';
import { Modal } from '@/src/components/common/Modal';
import { Button } from '@/src/components/common/Button';
import { createContactAction } from '@/app/directory/actions';
import { Loader2 } from 'lucide-react';
import { Contact } from '@/lib/types';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactCreated?: (contact: Contact) => void;
}

export function AddContactModal({ isOpen, onClose, onContactCreated }: AddContactModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const result = await createContactAction(null, formData);

    setIsSubmitting(false);

    if (result?.success && result.contact) {
      onContactCreated?.(result.contact);
      onClose();
      (event.target as HTMLFormElement).reset();
    } else {
      setError(result?.error || 'An error occurred');
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Contact">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-zinc-700">
            Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            placeholder="John Doe"
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Role */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-zinc-700">
            Role
          </label>
          <input
            type="text"
            name="role"
            id="role"
            placeholder="e.g. Banker, Lawyer, Family Member"
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="john@example.com"
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          />
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
              'Add Contact'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
