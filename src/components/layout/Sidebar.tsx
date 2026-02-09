'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useTranslation();

  const items = [
    { name: t('nav.dashboard'), href: '/' },
    { name: t('nav.airlock'), href: '/airlock' },
    { name: t('nav.portfolio'), href: '/portfolio' },
    { name: t('nav.ledger'), href: '/ledger' },
    { name: t('nav.directory'), href: '/directory' },
    { name: t('nav.documents'), href: '/documents' },
    { name: t('nav.governance'), href: '/governance' },
    { name: t('nav.settings'), href: '/settings' },
  ];

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
            <li key={item.href}>
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

      {isOpen && (
        <div className="p-4 border-t border-[#E5E5E5] flex justify-center">
          <LanguageSwitcher />
        </div>
      )}
    </aside>
  );
}
