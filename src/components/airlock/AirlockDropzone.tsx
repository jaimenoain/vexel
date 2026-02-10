'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useAirlockUpload } from '@/src/hooks/useAirlockUpload';

interface AirlockDropzoneProps {
  assetId?: string | null;
}

export function AirlockDropzone({ assetId }: AirlockDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, error } = useAirlockUpload();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    const success = await uploadFile(file, assetId);
    if (success && fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={clsx(
        "relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg transition-colors cursor-pointer",
        isDragOver ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:border-zinc-300 bg-zinc-50",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.csv"
      />

      {isUploading ? (
        <div className="flex flex-col items-center text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin mb-2" />
          <p>Ingesting file...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-zinc-500">
          <Upload className="w-10 h-10 mb-2" />
          <p className="font-medium text-zinc-900">Drag & drop or click to upload</p>
          <p className="text-sm">PDF or CSV only</p>
        </div>
      )}

      {error && (
        <div className="absolute bottom-4 flex items-center text-red-500 text-sm bg-red-50 px-3 py-1 rounded">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
}
