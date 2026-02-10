'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/context/AuthContext';
import { Asset } from '@/lib/types';
import { Button } from '@/src/components/common/Button';

interface AddRuleFormProps {
  onRuleAdded: () => void;
}

export function AddRuleForm({ onRuleAdded }: AddRuleFormProps) {
  const { user } = useAuth();
  const [trigger, setTrigger] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('name');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!trigger.trim()) {
        setMessage({ type: 'error', text: 'Trigger cannot be empty.' });
        return;
    }
    if (!selectedAssetId) {
        setMessage({ type: 'error', text: 'Please select a category (asset).' });
        return;
    }
    if (!user) {
        setMessage({ type: 'error', text: 'You must be logged in.' });
        return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('categorization_rules')
        .insert({
            user_id: user.id,
            trigger_pattern: trigger.trim(),
            action_asset_id: selectedAssetId
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Rule added successfully.' });
      setTrigger('');
      setSelectedAssetId('');
      onRuleAdded();
    } catch (error: any) {
      console.error('Error adding rule:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to add rule.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium text-[#111111] mb-4">Add New Rule</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="trigger" className="block text-sm font-medium text-zinc-700 mb-1">
            If description contains
          </label>
          <input
            id="trigger"
            type="text"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full border border-zinc-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder-zinc-400"
            placeholder="e.g. Netflix"
          />
        </div>

        <div>
          <label htmlFor="asset" className="block text-sm font-medium text-zinc-700 mb-1">
            Set Category to
          </label>
          <select
            id="asset"
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full border border-zinc-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 bg-white"
          >
            <option value="">Select an asset...</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.currency})
              </option>
            ))}
          </select>
        </div>

        {message && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message.text}
            </div>
        )}

        <div className="flex justify-end">
            <Button type="submit" isLoading={loading} disabled={loading}>
                Add Rule
            </Button>
        </div>
      </form>
    </div>
  );
}
