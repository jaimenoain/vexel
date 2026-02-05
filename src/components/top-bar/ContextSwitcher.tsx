'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useVexelContext } from '@/app/context/VexelContext';
import { Entity } from '@/lib/types';

export function ContextSwitcher() {
  const { session } = useAuth();
  const { selectedScope, setSelectedScope } = useVexelContext();
  const [directoryData, setDirectoryData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDirectory = async () => {
      if (!session?.access_token) return;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/directory', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch directory');
        }
        const data = await res.json();
        setDirectoryData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, [session?.access_token]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getLabel = () => {
    if (selectedScope.type === 'GLOBAL') return 'Global Position';
    return selectedScope.name;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-900 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:bg-black dark:text-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <span>{getLabel()}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 w-64 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg dark:bg-black dark:border-zinc-800 max-h-96 overflow-y-auto">
          <div className="py-1">
            <button
              onClick={() => {
                setSelectedScope({ type: 'GLOBAL' });
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                selectedScope.type === 'GLOBAL' ? 'font-semibold bg-zinc-50 dark:bg-zinc-900' : ''
              }`}
            >
              Global Position
            </button>

            {loading && <div className="px-4 py-2 text-sm text-zinc-500">Loading...</div>}
            {error && <div className="px-4 py-2 text-sm text-red-500">Error loading data</div>}

            {directoryData.map((entity) => (
              <div key={entity.id}>
                <div
                    className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-2"
                >
                  {entity.name}
                </div>

                <button
                    onClick={() => {
                        setSelectedScope({ type: 'ENTITY', id: entity.id, name: entity.name });
                        setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                        selectedScope.type === 'ENTITY' && selectedScope.id === entity.id ? 'font-semibold bg-zinc-50 dark:bg-zinc-900' : ''
                    }`}
                >
                  All {entity.name} Assets
                </button>

                {entity.assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setSelectedScope({ type: 'ASSET', id: asset.id, name: asset.name });
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-sm text-left pl-8 hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                      selectedScope.type === 'ASSET' && selectedScope.id === asset.id ? 'font-semibold bg-zinc-50 dark:bg-zinc-900' : ''
                    }`}
                  >
                    {asset.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
