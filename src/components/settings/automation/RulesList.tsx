'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/context/AuthContext';
import { Trash2 } from 'lucide-react';

interface Rule {
  id: string;
  trigger_pattern: string;
  asset: {
    name: string;
    currency: string;
  } | null;
}

interface RulesListProps {
  refreshTrigger: number;
}

export function RulesList({ refreshTrigger }: RulesListProps) {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchRules = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorization_rules')
        .select(`
          id,
          trigger_pattern,
          asset:assets (
            name,
            currency
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRules((data as unknown) as Rule[]);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [user, refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      const { error } = await supabase
        .from('categorization_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('Failed to delete rule');
    }
  };

  if (loading && rules.length === 0) {
    return <div className="text-zinc-500 py-4">Loading rules...</div>;
  }

  if (rules.length === 0) {
    return <div className="text-zinc-500 py-4 italic">No categorization rules configured.</div>;
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200">
            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Trigger</th>
            <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Category (Asset)</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-zinc-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 font-mono">
                {rule.trigger_pattern}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                {rule.asset ? `${rule.asset.name} (${rule.asset.currency})` : <span className="text-red-500">Unknown Asset</span>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                  aria-label="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
