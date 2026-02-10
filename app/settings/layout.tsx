import React from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { SettingsLayout } from '@/src/components/settings/SettingsLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <SettingsLayout>
        {children}
      </SettingsLayout>
    </Shell>
  );
}
