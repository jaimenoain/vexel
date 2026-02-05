'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type VexelScope =
  | { type: 'GLOBAL' }
  | { type: 'ENTITY'; id: string; name: string }
  | { type: 'ASSET'; id: string; name: string };

interface VexelContextType {
  selectedScope: VexelScope;
  setSelectedScope: (scope: VexelScope) => void;
}

const VexelContext = createContext<VexelContextType | undefined>(undefined);

export function VexelProvider({ children }: { children: ReactNode }) {
  const [selectedScope, setSelectedScope] = useState<VexelScope>({ type: 'GLOBAL' });

  return (
    <VexelContext.Provider value={{ selectedScope, setSelectedScope }}>
      {children}
    </VexelContext.Provider>
  );
}

export function useVexelContext() {
  const context = useContext(VexelContext);
  if (context === undefined) {
    throw new Error('useVexelContext must be used within a VexelProvider');
  }
  return context;
}
