'use client';

export function GovernanceAlerts() {
  return (
    <div className="flex flex-col gap-2 p-6">
      <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">Governance Alerts</h2>
      <div className="flex items-baseline gap-2">
        <span className="text-6xl md:text-7xl font-light text-[#111111] leading-none tracking-tight">
          0
        </span>
        <span className="text-xl text-gray-500 font-light">alerts</span>
      </div>
      <p className="text-sm text-gray-400 mt-2">
        No overdue items detected.
      </p>
    </div>
  );
}
