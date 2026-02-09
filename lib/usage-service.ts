import { SupabaseClient } from '@supabase/supabase-js';
import { FREE_TIER_LIMIT } from './constants';

export interface UsageStatus {
  current_count: number;
  limit: number;
  is_over_limit: boolean;
}

export async function getUsageStatus(supabase: SupabaseClient): Promise<UsageStatus> {
  // Use head: true to fetch only the count, not the actual rows.
  // count: 'exact' ensures we get the total count respecting RLS.
  const { count, error } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to fetch asset usage: ${error.message}`);
  }

  const currentCount = count || 0;

  return {
    current_count: currentCount,
    limit: FREE_TIER_LIMIT,
    is_over_limit: currentCount > FREE_TIER_LIMIT,
  };
}
