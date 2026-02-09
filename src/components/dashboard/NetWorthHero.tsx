'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/formatting';

export function NetWorthHero() {
  const { session } = useAuth();
  const { t, i18n } = useTranslation();

  // Use inline fetcher to handle SWR args safely
  const { data: safeData, error: safeError, isLoading: safeLoading } = useSWR(
    session ? ['/api/dashboard/net-worth', session.access_token] : null,
    ([url, token]) => fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json())
  );

  if (safeLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse p-6">
        <div className="h-6 w-32 bg-[#E5E5E5] rounded"></div>
        <div className="h-16 w-64 bg-[#E5E5E5] rounded"></div>
      </div>
    );
  }

  if (safeError) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">{t('dashboard.net_worth')}</h2>
        <p className="text-red-500">Error loading data</p>
      </div>
    );
  }

  const netWorth = safeData?.net_worth ?? 0;
  // Format number using formatCurrency
  const formattedValue = formatCurrency(netWorth, 'USD', i18n.language);

  return (
    <div className="flex flex-col gap-2 p-6 group cursor-default">
      <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">{t('dashboard.net_worth')}</h2>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-4xl lg:text-5xl font-light text-[#111111] leading-tight tracking-tight break-words">
          {formattedValue}
        </span>
      </div>
    </div>
  );
}
