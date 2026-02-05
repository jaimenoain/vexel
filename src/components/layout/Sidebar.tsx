'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const items = [
  { name: 'Dashboard', href: '/' },
  { name: 'Airlock', href: '/airlock' },
  { name: 'Portfolio', href: '/portfolio' },
  { name: 'Ledger', href: '/ledger' },
  { name: 'Directory', href: '/directory' },
  { name: 'Documents', href: '/documents' },
  { name: 'Governance', href: '/governance' },
  { name: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside
      className={`
        hidden md:flex flex-col border-r border-[#E5E5E5] bg-[#FFFFFF] text-[#111111]
        transition-all duration-300 ease-in-out h-screen sticky top-0
        ${isOpen ? 'w-64' : 'w-16'}
      `}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#E5E5E5]">
        {isOpen && <span className="font-bold text-lg tracking-tight">VEXEL</span>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-[#F5F5F5] rounded text-[#111111]"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`
                  block py-2 text-sm font-medium hover:bg-[#F5F5F5] transition-colors
                  ${isOpen ? 'px-6' : 'px-2 text-center'}
                `}
                title={!isOpen ? item.name : undefined}
              >
                {isOpen ? item.name : item.name.charAt(0)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
