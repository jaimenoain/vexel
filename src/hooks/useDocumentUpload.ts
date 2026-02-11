import { useState } from 'react';
import { useSWRConfig } from 'swr';

export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      // Refresh the list immediately
      mutate('/api/documents');
      return true;

    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadDocument, isUploading, error };
}
