'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';

export function PendingActions() {
  const { session } = useAuth();

  const { data: airlockData, isLoading: airlockLoading, error: airlockError } = useSWR(
    session ? ['/api/airlock', session.access_token] : null,
    ([url, token]) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch airlock data');
        return res.json();
      })
  );

  const { data: governanceData, isLoading: governanceLoading, error: governanceError } = useSWR(
    session ? ['/api/dashboard/governance-alerts', session.access_token] : null,
    ([url, token]) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error('Failed to fetch governance data');
        return res.json();
      })
  );

  if (airlockLoading || governanceLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="h-6 w-32 bg-[#E5E5E5] rounded"></div>
        <div className="h-16 w-16 bg-[#E5E5E5] rounded"></div>
      </div>
    );
  }

  if (airlockError || governanceError) {
     return (
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">Pending Actions</h2>
        <p className="text-red-500">Error loading data</p>
      </div>
    );
  }

  // Calculate Airlock pending
  const airlockItems = Array.isArray(airlockData) ? airlockData : [];
  const airlockPendingCount = airlockItems.filter((item: any) =>
    item.status === 'REVIEW_NEEDED' ||
    item.traffic_light === 'RED' ||
    item.traffic_light === 'YELLOW'
  ).length;

  // Calculate Governance pending (tasks are already filtered by OPEN status in the API)
  const governanceItems = Array.isArray(governanceData) ? governanceData : [];
  const governancePendingCount = governanceItems.length;

  const totalPending = airlockPendingCount + governancePendingCount;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">Pending Actions</h2>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl md:text-7xl font-light font-mono text-[#111111] leading-none tracking-tight">
          {totalPending}
        </span>
        <span className="text-xl text-[#111111] font-light">items</span>
      </div>
    </div>
  );
}
