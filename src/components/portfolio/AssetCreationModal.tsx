'use client';

import React, { useState } from 'react';
import { Modal } from '@/src/components/common/Modal';
import { Button } from '@/src/components/common/Button'; // Assuming relative import works, or adjust path
import { useAuth } from '@/app/context/AuthContext';
import { mutate } from 'swr';

interface AssetCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AssetCreationModal: React.FC<AssetCreationModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK',
    currency: 'USD',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // For currency, force uppercase
    const newValue = name === 'currency' ? value.toUpperCase() : value;

    setFormData(prev => ({ ...prev, [name]: newValue }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.currency.trim() || formData.currency.length !== 3) {
      setError('Currency must be 3 characters (e.g. USD)');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create asset');
      }

      // Success
      // Invalidate the cache for directory listing
      mutate((key: any) => Array.isArray(key) && key[0] === '/api/directory');

      onSuccess?.();
      onClose();
      setFormData({ name: '', type: 'BANK', currency: 'USD' }); // Reset form
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Asset">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
            placeholder="e.g. Chase Checking"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm bg-white"
              disabled={isLoading}
            >
              <option value="BANK">Bank Account</option>
              <option value="PROPERTY">Real Estate / Property</option>
              <option value="EQUITY">Equity / Investment</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <input
              type="text"
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black sm:text-sm"
              placeholder="USD"
              maxLength={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Asset
          </Button>
        </div>
      </form>
    </Modal>
  );
};
