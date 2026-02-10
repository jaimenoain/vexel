import useSWR from 'swr';
import { useAuth } from '@/app/context/AuthContext';
import { UsageStatus } from '@/lib/usage-service';

const fetcher = (url: string, token: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(async (res) => {
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || `Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  });

export function useUsage() {
  const { session, loading: authLoading } = useAuth();

  const { data, error, isLoading: swrLoading } = useSWR<UsageStatus>(
    session ? '/api/usage' : null,
    (url: string) => fetcher(url, session?.access_token || '')
  );

  return {
    usage: data,
    isLoading: authLoading || swrLoading,
    isError: error,
  };
}
