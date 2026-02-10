'use client';

import React, { useRef, ChangeEvent } from 'react';
import Link from 'next/link';
import { Menu as MenuIcon, LayoutDashboard, ShieldCheck, BookOpen, Plus } from 'lucide-react';

export function BottomTabs() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      // TODO: Implement actual upload logic here
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#FFFFFF] border-t border-[#E5E5E5] flex items-center justify-around z-50">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        data-testid="file-upload-input"
      />
      <Link href="/" className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <LayoutDashboard size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Dashboard</span>
      </Link>
      <Link href="/airlock" className="flex flex-col items-center justify-center w-full h-full text-[#111111] hover:bg-[#F5F5F5]">
        <ShieldCheck size={20} strokeWidth={1.5} />
        <span className="text-[10px] mt-1 font-medium">Airlock</span>
      </Link>

      <div className="relative -top-6">
        <button
          onClick={handleUploadClick}
          className="flex items-center justify-center w-14 h-14 bg-[#111111] rounded-full text-white shadow-lg hover:scale-105 transition-transform"
          aria-label="Upload"
        >
          <Plus size={28} strokeWidth={2} />
        </button>
      </div>

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
