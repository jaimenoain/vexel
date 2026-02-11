import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `Error ${res.status}`);
  }
  return res.json();
};

export function useDocuments() {
  const { data, error, mutate, isLoading } = useSWR('/api/documents', fetcher);
  return {
    documents: data,
    isLoading,
    isError: error,
    mutate
  };
}
