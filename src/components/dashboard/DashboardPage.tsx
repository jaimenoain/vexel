'use client';

import { NetWorthHero } from './NetWorthHero';
import { PendingActions } from './PendingActions';
import { GovernanceAlerts } from './GovernanceAlerts';

export function DashboardPage() {
  return (
    <div className="w-full h-full bg-white">
      {/*
        Swiss International Style:
        - 3-Column Grid on Desktop
        - Single Column on Mobile
        - Simple dividers (#E5E5E5 -> border-gray-200)
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 border-b border-gray-200">
        <div className="flex flex-col">
          <NetWorthHero />
        </div>
        <div className="flex flex-col">
          <PendingActions />
        </div>
        <div className="flex flex-col">
          <GovernanceAlerts />
        </div>
      </div>
    </div>
  );
}
