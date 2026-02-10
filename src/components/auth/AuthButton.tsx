import React from 'react';

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AuthButton({ children, className = '', ...props }: AuthButtonProps) {
  return (
    <button
      className={`w-full bg-[#111111] text-white font-bold py-3 px-4 hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#111111] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
