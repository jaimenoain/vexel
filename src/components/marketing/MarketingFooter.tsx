import React from 'react';
import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="w-full border-t border-zinc-100 py-12 px-8 bg-background text-sm text-zinc-400">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          © 2024 Vexel Inc.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-600 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-600 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
