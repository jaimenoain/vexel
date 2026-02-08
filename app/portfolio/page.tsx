'use client';

import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { Shell } from '@/src/components/layout/Shell';
import { EntityAccordion } from '@/src/components/portfolio/EntityAccordion';
import { Entity } from '@/lib/types';

export default function PortfolioPage() {
  const { session } = useAuth();

  const { data, error, isLoading } = useSWR<Entity[]>(
    session ? ['/api/directory', session.access_token] : null,
    ([url, token]: [string, string]) => fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => res.json())
  );

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Portfolio</h1>
        <div className="border-t border-[#E5E5E5]">
          {isLoading && (
            <div className="p-4 text-gray-500 animate-pulse">Loading...</div>
          )}
          {error && (
            <div className="p-4 text-red-500">Error loading portfolio</div>
          )}
          {data?.map((entity) => (
            <EntityAccordion key={entity.id} entity={entity} />
          ))}
          {data && data.length === 0 && (
             <div className="p-4 text-gray-500 italic">No entities found.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
