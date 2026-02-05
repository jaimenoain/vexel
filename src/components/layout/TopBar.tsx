'use client';

import React from 'react';
import { ContextSwitcher } from '../top-bar/ContextSwitcher';

export function TopBar() {
  return (
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6 bg-white dark:bg-black">
      <ContextSwitcher />
    </div>
  );
}
