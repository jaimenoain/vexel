'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/src/components/common/Switch';

export default function NotificationSettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState({
    airlock_ready: true,
    governance_alert: true,
  });
  const [updating, setUpdating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.notification_settings) {
      setSettings(profile.notification_settings);
    }
  }, [profile]);

  const handleToggle = async (key: 'airlock_ready' | 'governance_alert') => {
    if (!user) return;

    // Optimistic update
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: newSettings })
        .eq('id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert on error
      setSettings((prev) => ({ ...prev, [key]: !newSettings[key] }));
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading) {
    return <div className="p-4">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Notifications</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-medium mb-4">Email Preferences</h2>
          <div className="bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">

            {/* Airlock Ready - Non-critical */}
            <div className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm text-[#111111]">Airlock Ready</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Receive a summary when files are processed and ready for review.
                </p>
              </div>
              <Switch
                checked={settings.airlock_ready}
                onCheckedChange={() => handleToggle('airlock_ready')}
                aria-label="Toggle Airlock Ready notifications"
                disabled={updating}
              />
            </div>

            {/* Governance Alerts - Critical */}
            <div className="p-4 flex items-center justify-between bg-zinc-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm text-[#111111]">Governance Alerts</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                    Critical
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-1">
                  Alerts regarding missing documentation and compliance tasks.
                </p>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-xs text-zinc-400 font-medium">Enforced</span>
                 <Switch
                  checked={true}
                  onCheckedChange={() => {}}
                  aria-label="Governance Alerts notifications (enforced)"
                  disabled={true}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
