'use client';

import React, { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { PlanLimitBanner } from '@/src/components/common/PlanLimitBanner';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex min-h-screen bg-[#FFFFFF] text-[#111111] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 mb-16 md:mb-0">
        <PlanLimitBanner />
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
        <BottomTabs />
      </div>
    </div>
  );
}
