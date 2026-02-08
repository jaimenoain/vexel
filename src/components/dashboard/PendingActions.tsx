'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import clsx from 'clsx';

export function PendingActions() {
  const { session } = useAuth();

  const { data, error, isLoading } = useSWR(
    session ? ['/api/airlock', session.access_token] : null,
    ([url, token]) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded"></div>
        <div className="h-16 w-16 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Pending Actions</h2>
        <p className="text-red-500">Error loading data</p>
      </div>
    );
  }

  const items = Array.isArray(data) ? data : [];

  const pendingCount = items.filter((item: any) =>
    item.status === 'REVIEW_NEEDED' ||
    item.traffic_light === 'RED' ||
    item.traffic_light === 'YELLOW'
  ).length;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Pending Actions</h2>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl md:text-7xl font-light text-[#111111] leading-none tracking-tight">
          {pendingCount}
        </span>
        <span className="text-xl text-gray-500 font-light">items</span>
      </div>
    </div>
  );
}
