'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

interface GovernanceTask {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
  asset_id: string;
  action_payload: any;
}

export function GovernanceAlerts() {
  const { session } = useAuth();
  const router = useRouter();

  const { data, error, isLoading } = useSWR(
    session ? ['/api/dashboard/governance-alerts', session.access_token] : null,
    ([url, token]) =>
      fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json())
  );

  const handleTaskClick = (task: GovernanceTask) => {
    if (task.action_payload && task.action_payload.type === 'UPLOAD_PROOF') {
      router.push(`/airlock?asset_id=${task.asset_id}`);
    } else {
        // Fallback or other actions
        console.log('Task clicked:', task);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="h-6 w-48 bg-[#E5E5E5] rounded"></div>
        <div className="h-16 w-16 bg-[#E5E5E5] rounded"></div>
        <div className="h-4 w-full bg-[#E5E5E5] rounded"></div>
        <div className="h-4 w-full bg-[#E5E5E5] rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">Governance Alerts</h2>
        <p className="text-red-500">Error loading alerts</p>
      </div>
    );
  }

  const tasks: GovernanceTask[] = Array.isArray(data) ? data : [];
  const alertCount = tasks.length;

  return (
    <div className="flex flex-col gap-2 p-6 h-full">
      <h2 className="text-lg font-bold text-[#111111] uppercase tracking-wide">Governance Alerts</h2>

      <div className="flex items-baseline gap-2 mb-4">
        <span className={`text-6xl md:text-7xl font-light leading-none tracking-tight ${alertCount > 0 ? 'text-red-600' : 'text-[#111111]'}`}>
          {alertCount}
        </span>
        <span className="text-xl text-[#111111] font-light">alerts</span>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-[#111111] mt-2">
          No overdue items detected.
        </p>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[300px] pr-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="group flex flex-col gap-1 p-3 border border-[#E5E5E5] hover:border-[#111111] cursor-pointer transition-colors bg-white"
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm text-[#111111] group-hover:underline">
                  {task.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider ${
                  task.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                  task.priority === 'HIGH' ? 'bg-orange-100 text-orange-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {task.priority}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">
                {task.description}
              </p>
              <div className="text-[10px] text-gray-400 mt-1">
                {new Date(task.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
