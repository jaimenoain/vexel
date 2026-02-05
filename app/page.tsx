'use client';

import { Shell } from "@/src/components/layout/Shell";
import { useVexelContext } from "@/app/context/VexelContext";

export default function Home() {
  const { selectedScope } = useVexelContext();

  return (
    <Shell>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <h1 className="text-2xl font-semibold">
          {selectedScope.type === 'GLOBAL' ? 'Global Position' : null}
          {selectedScope.type === 'ENTITY' ? selectedScope.name : null}
          {selectedScope.type === 'ASSET' ? selectedScope.name : null}
        </h1>
        <p className="mt-4 text-zinc-500">
          Select a context from the top bar to switch views.
        </p>
      </div>
    </Shell>
  );
}
