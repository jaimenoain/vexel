'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR, { mutate } from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface GovernanceTask {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  due_date: string | null;
  asset_id: string | null;
  asset?: { name: string } | null;
}

export function GovernanceTaskList() {
  const { session } = useAuth();
  const supabase = createClient();
  const [filter, setFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN');

  const { data: tasks, error, isLoading, mutate: refreshTasks } = useSWR(
    session ? ['governance_tasks', filter, session.access_token] : null,
    async () => {
      const { data, error } = await supabase
        .from('governance_tasks')
        .select('*, asset:assets(name)')
        .eq('status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as GovernanceTask[];
    }
  );

  const handleResolve = async (id: string) => {
    try {
      const { error } = await supabase
        .from('governance_tasks')
        .update({ status: 'RESOLVED' })
        .eq('id', id);

      if (error) throw error;
      refreshTasks();
    } catch (err) {
      console.error('Error resolving task:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-100 rounded-md"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading tasks.</div>;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
        <button
          onClick={() => setFilter('OPEN')}
          className={clsx(
            "text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
            filter === 'OPEN' ? "bg-black text-white" : "text-zinc-500 hover:text-black hover:bg-zinc-100"
          )}
        >
          Open Tasks
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          className={clsx(
            "text-sm font-medium px-3 py-1.5 rounded-md transition-colors",
            filter === 'RESOLVED' ? "bg-black text-white" : "text-zinc-500 hover:text-black hover:bg-zinc-100"
          )}
        >
          Resolved / Archived
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {tasks?.length === 0 ? (
          <div className="text-center py-12 text-zinc-400">
            No {filter.toLowerCase()} tasks found.
          </div>
        ) : (
          tasks?.map((task) => (
            <div
              key={task.id}
              className="flex items-start justify-between p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors bg-white group"
            >
              <div className="flex flex-col gap-1.5 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900">{task.title}</h3>
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold border uppercase tracking-wide", getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="text-sm text-zinc-500 line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400 font-mono">
                  {task.asset && (
                    <span className="flex items-center gap-1">
                      Target: {task.asset.name}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3" />
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {filter === 'OPEN' && (
                <button
                  onClick={() => handleResolve(task.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 border border-zinc-200 rounded-md hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Check className="w-3 h-3" />
                  Mark Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
