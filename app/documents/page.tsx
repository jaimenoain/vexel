'use client';

import React, { useRef } from 'react';
import { Shell } from '@/src/components/layout/Shell';
import { Button } from '@/src/components/common/Button';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';
import { useDocuments } from '@/src/hooks/useDocuments';
import { useDocumentUpload } from '@/src/hooks/useDocumentUpload';
import { formatBytes } from '@/lib/formatting';

export default function DocumentsPage() {
  const { documents, isLoading, isError } = useDocuments();
  const { uploadDocument, isUploading } = useDocumentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const success = await uploadDocument(file);
      if (success && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (id: string) => {
    try {
        const res = await fetch(`/api/documents/${id}/download`);
        if (!res.ok) throw new Error('Failed to get download URL');
        const { url } = await res.json();
        window.open(url, '_blank');
    } catch (e) {
        console.error(e);
        alert('Failed to download document');
    }
  };

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">Documents</h1>
            <p className="text-zinc-500 text-sm">Storage Only - No Parsing</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            data-testid="documents-upload-input"
          />
          <Button
            onClick={handleUploadClick}
            disabled={isUploading}
            icon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>

        {isLoading ? (
             <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-400" /></div>
        ) : isError ? (
            <div className="text-red-500 p-4 border border-red-100 rounded bg-red-50">Failed to load documents.</div>
        ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400 border border-dashed border-zinc-200 rounded-lg">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p>No documents uploaded yet.</p>
            </div>
        ) : (
            <div className="border rounded-lg overflow-hidden border-zinc-200">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                        <tr>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium w-32">Size</th>
                            <th className="px-4 py-3 font-medium w-48">Date</th>
                            <th className="px-4 py-3 font-medium w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                        {documents.map((doc: any) => (
                            <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-4 py-3 flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-zinc-400" />
                                    <span className="font-medium text-zinc-900">{doc.name}</span>
                                </td>
                                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                                    {doc.size ? formatBytes(doc.size) : '-'}
                                </td>
                                <td className="px-4 py-3 text-zinc-500">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleDownload(doc.id)}
                                        className="text-zinc-400 hover:text-zinc-900 transition-colors"
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </Shell>
  );
}
