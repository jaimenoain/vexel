import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFFFF] text-[#111111] font-sans">
      <div className="w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}
