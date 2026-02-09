'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { formatCurrencyParts } from '@/lib/formatting';
import { Download, Loader2 } from 'lucide-react';
import { SimpleToast } from '@/src/components/common/SimpleToast';

export function NetWorthHero() {
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const generateReport = async () => {
    if (!session) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/net-worth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Net_Worth_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({ message: 'Report downloaded successfully', type: 'success' });
    } catch (error) {
      console.error('Report generation error:', error);
      setToast({ message: 'Failed to generate report', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

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
  // Format number using formatCurrencyParts
  const { symbol, value } = formatCurrencyParts(netWorth, 'USD', i18n.language);

  return (
    <div className="flex flex-col gap-2 p-6 group cursor-default relative">
      <div className="flex justify-between items-start">
        <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">{t('dashboard.net_worth')}</h2>
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-[#111111] border border-[#E5E5E5] rounded-sm hover:border-[#111111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {isGenerating ? t('dashboard.generating_report') : t('dashboard.download_report')}
        </button>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <div className="text-4xl lg:text-5xl font-light text-[#111111] leading-tight tracking-tight break-words flex items-baseline">
          <span className="hidden group-hover:inline mr-2 transition-all duration-200">{symbol}</span>
          <span>{value}</span>
        </div>
      </div>
      {toast && (
        <SimpleToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
