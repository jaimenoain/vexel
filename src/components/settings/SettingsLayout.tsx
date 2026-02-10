'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'General', href: '/settings/general' },
  { name: 'Notifications', href: '/settings/notifications' },
  { name: 'Automation', href: '/settings/automation' },
  { name: 'Billing', href: '/settings/billing' },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 h-full">
      <aside className="w-full md:w-64 flex-shrink-0">
        <h2 className="text-xl font-medium mb-6 px-4 md:px-0">Settings</h2>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
          {navItems.map((item) => {
            const isActive = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-[#F5F5F5] text-[#111111]'
                    : 'text-zinc-500 hover:text-[#111111] hover:bg-zinc-50'
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
