'use client';

import { useUsage } from '@/src/hooks/useUsage';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function PlanLimitBanner() {
  const { usage, isLoading, isError } = useUsage();

  if (isLoading || isError || !usage || !usage.is_over_limit) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium text-sm">
          Plan Limit Exceeded. You are tracking {usage.current_count} of {usage.limit} free assets. Upgrade to remove limits.
        </span>
      </div>
      <Link href="#" className="bg-white text-amber-600 px-3 py-1 rounded font-semibold text-xs hover:bg-amber-50 transition-colors">
        Upgrade
      </Link>
    </div>
  );
}
