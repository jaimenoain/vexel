import React from 'react';
import Link from 'next/link';

export function MarketingNavbar() {
  return (
    <nav className="w-full flex justify-between items-center py-6 px-8 sticky top-0 z-50 bg-transparent">
      <div className="font-bold tracking-tight text-xl font-sans text-[#111111]">
        Vexel
      </div>
      <Link
        href="/login"
        className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 h-10 px-4 text-sm bg-transparent text-[#111111] hover:bg-gray-100 focus:ring-gray-200"
      >
        Sign In
      </Link>
    </nav>
  );
}
