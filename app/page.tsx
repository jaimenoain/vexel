'use client';

import { Shell } from "@/src/components/layout/Shell";
import { useVexelContext } from "@/app/context/VexelContext";
import { DashboardPage } from "@/src/components/dashboard/DashboardPage";
import { useAuth } from "@/app/context/AuthContext";
import LandingPage from "@/src/components/marketing/LandingPage";

export default function Home() {
  const { user, loading } = useAuth();
  const { selectedScope } = useVexelContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

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
