'use client';

import React from 'react';
import Link from 'next/link';
import { Menu as MenuIcon, LayoutDashboard, ShieldCheck, BookOpen } from 'lucide-react';

export function BottomTabs() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FFFFFF] border-t border-[#E5E5E5] flex items-center justify-around z-50">
      <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <LayoutDashboard size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Dashboard</span>
      </Link>
      <Link href="/airlock" className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <ShieldCheck size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Airlock</span>
      </Link>
      <Link href="/ledger" className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <BookOpen size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Ledger</span>
      </Link>
      <button className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <MenuIcon size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Menu</span>
      </button>
    </div>
  );
}
