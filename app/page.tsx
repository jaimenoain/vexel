'use client';

import { Shell } from "@/src/components/layout/Shell";
import { useVexelContext } from "@/app/context/VexelContext";
import { DashboardPage } from "@/src/components/dashboard/DashboardPage";

export default function Home() {
  const { selectedScope } = useVexelContext();

  return (
    <Shell>
      {selectedScope.type === 'GLOBAL' ? (
        <DashboardPage />
      ) : (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
          <h1 className="text-2xl font-semibold">
            {selectedScope.type === 'ENTITY' ? selectedScope.name : null}
            {selectedScope.type === 'ASSET' ? selectedScope.name : null}
          </h1>
          <p className="mt-4 text-zinc-500">
            Select "Global Position" to view the Cockpit.
          </p>
        </div>
      )}
    </Shell>
  );
}
