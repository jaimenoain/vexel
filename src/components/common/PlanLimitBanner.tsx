'use client';

import useSWR from 'swr';
import { UsageStatus } from '@/lib/usage-service';
import { useAuth } from '@/app/context/AuthContext';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string, token: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((res) => res.json());

export function PlanLimitBanner() {
  const { session } = useAuth();

  const { data, error, isLoading } = useSWR<UsageStatus>(
    session ? '/api/usage' : null,
    (url: string) => fetcher(url, session?.access_token || '')
  );

  if (isLoading || error || !data || !data.is_over_limit) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium text-sm">
          Plan Limit Exceeded. You are tracking {data.current_count} of {data.limit} free assets. Upgrade to remove limits.
        </span>
      </div>
      <Link href="#" className="bg-white text-amber-600 px-3 py-1 rounded font-semibold text-xs hover:bg-amber-50 transition-colors">
        Upgrade
      </Link>
    </div>
  );
}
