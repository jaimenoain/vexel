'use client';

import React from 'react';
import { ContextSwitcher } from '../top-bar/ContextSwitcher';

export function TopBar() {
  return (
    <div className="h-16 border-b border-[#E5E5E5] flex items-center px-6 bg-[#FFFFFF] text-[#111111]">
      <ContextSwitcher />
    </div>
  );
}
