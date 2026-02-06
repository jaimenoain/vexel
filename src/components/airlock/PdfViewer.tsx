import React from 'react';

interface PdfViewerProps {
  url: string | null;
}

export function PdfViewer({ url }: PdfViewerProps) {
  if (!url) {
    return (
       <div className="w-full h-full flex items-center justify-center bg-white text-[#111111] border border-[#E5E5E5]">
        <p>No document available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border border-[#E5E5E5] overflow-hidden">
      <iframe
        src={url}
        className="w-full h-full border-none"
        title="PDF Document"
      />
    </div>
  );
}
