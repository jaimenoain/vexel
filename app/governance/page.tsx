'use client';

import React, { useState } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Button } from '@/src/components/common/Button';
import { Plus } from 'lucide-react';
import { GovernanceTaskList } from '@/src/components/governance/GovernanceTaskList';
import { CreateTaskModal } from '@/src/components/governance/CreateTaskModal';
import { useSWRConfig } from 'swr';
import { useAuth } from '@/app/context/AuthContext';

export default function GovernancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate } = useSWRConfig();
  const { session } = useAuth();

  const handleTaskCreated = () => {
    // Revalidate the task list
    mutate(['governance_tasks', 'OPEN', session?.access_token]);
  };

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Governance</h1>
          <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Add Task
          </Button>
        </div>

        <GovernanceTaskList />

        <CreateTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTaskCreated={handleTaskCreated}
        />
      </div>
    </Shell>
  );
}
