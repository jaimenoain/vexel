import React from 'react';
import { MarketingNavbar } from './MarketingNavbar';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MarketingNavbar />
      <main className="flex-1">
        {/* Content */}
      </main>
    </div>
  );
}
