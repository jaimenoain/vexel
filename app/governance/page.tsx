'use client';

import React from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Button } from '@/src/components/common/Button';
import { Plus } from 'lucide-react';

export default function GovernancePage() {
  const handleAddTask = () => {
    alert('Not implemented yet');
  };

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Governance</h1>
          <Button onClick={handleAddTask} icon={<Plus className="h-4 w-4" />}>
            Add Task
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-zinc-500 border-t border-[#E5E5E5]">
          <p>Module under construction.</p>
        </div>
      </div>
    </Shell>
  );
}
