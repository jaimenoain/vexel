'use client';

import React, { useState } from 'react';
import { Modal } from '@/src/components/common/Modal';
import { Button } from '@/src/components/common/Button';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export function CreateTaskModal({ isOpen, onClose, onTaskCreated }: CreateTaskModalProps) {
  const { session } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetId, setAssetId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Fetch assets
  const { data: assets } = useSWR(
    session ? ['assets', session.access_token] : null,
    async () => {
      const { data, error } = await supabase.from('assets').select('id, name').order('name');
      if (error) throw error;
      return data;
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from('governance_tasks').insert({
        title,
        description,
        asset_id: assetId || null,
        due_date: dueDate || null,
        priority,
        user_id: session?.user?.id,
        status: 'OPEN'
      });

      if (error) throw error;

      onTaskCreated();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setAssetId('');
      setDueDate('');
      setPriority('MEDIUM');
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Task Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            placeholder="e.g., Review Q3 Performance"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[80px]"
            placeholder="Add details about this task..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">Assigned Asset (Optional)</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="">No Asset</option>
              {assets?.map((asset: any) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
             <label className="text-sm font-medium text-zinc-700">Due Date</label>
             <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
