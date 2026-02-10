'use client';

import React from 'react';
import { useUsage } from '@/src/hooks/useUsage';
import { Button } from '@/src/components/common/Button';
import clsx from 'clsx';

export function BillingSettings() {
  const { usage, isLoading, isError } = useUsage();

  if (isLoading) {
    return <div className="p-4 text-zinc-500">Loading plan details...</div>;
  }

  if (isError || !usage) {
    return <div className="p-4 text-red-500">Failed to load plan details.</div>;
  }

  const percentage = Math.min((usage.current_count / usage.limit) * 100, 100);
  const isOverLimit = usage.is_over_limit;
  const isApproachingLimit = !isOverLimit && percentage >= 80;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium leading-6 text-[#111111]">Plan & Billing</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your subscription and view usage limits.
        </p>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className="text-base font-medium text-[#111111]">{usage.plan_name}</h4>
            <p className="text-sm text-zinc-500 mt-1">
              You are currently on the {usage.plan_name} plan.
            </p>
          </div>
          <div className="bg-zinc-100 text-zinc-600 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            CURRENT PLAN
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-[#111111]">Active Assets</span>
            <span className={clsx(
              "font-medium",
              isOverLimit ? "text-red-600" : isApproachingLimit ? "text-amber-600" : "text-zinc-600"
            )}>
              {usage.current_count} / {usage.limit}
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={clsx(
                "h-2.5 rounded-full transition-all duration-500",
                isOverLimit ? "bg-red-500" : isApproachingLimit ? "bg-amber-500" : "bg-[#111111]"
              )}
              style={{ width: `${percentage}%` }}
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {isOverLimit
              ? "You have exceeded your plan limits. Please upgrade to continue adding assets."
              : `You are tracking ${usage.current_count} of ${usage.limit} assets included in your plan.`}
          </p>
        </div>

        <div className="border-t border-[#E5E5E5] pt-6 flex justify-end">
          <Button variant="primary" size="sm">
            Upgrade Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
