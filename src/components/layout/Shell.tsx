'use client';

import React, { ReactNode } from 'react';
import { TopBar } from './TopBar';

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <TopBar />
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
