'use client';

import React, { useState } from 'react';
import { AddRuleForm } from '@/src/components/settings/automation/AddRuleForm';
import { RulesList } from '@/src/components/settings/automation/RulesList';

export default function AutomationSettingsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRuleAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111111] mb-2 tracking-tight">Automation Rules</h1>
        <p className="text-zinc-500">
          Configure rules to automatically categorize transactions based on their description.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <AddRuleForm onRuleAdded={handleRuleAdded} />
        </section>

        <section>
          <h2 className="text-lg font-medium text-[#111111] mb-4">Active Rules</h2>
          <RulesList refreshTrigger={refreshTrigger} />
        </section>
      </div>
    </div>
  );
}
