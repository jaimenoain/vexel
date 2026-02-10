import { useState } from 'react';
import { useSWRConfig } from 'swr';

export function useAirlockUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const uploadFile = async (file: File, assetId?: string | null) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (assetId) {
      formData.append('asset_id', assetId);
    }

    try {
      const res = await fetch('/api/airlock/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      // Refresh the list immediately
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/airlock'),
        undefined,
        { revalidate: true }
      );

      return true;

    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, error };
}
