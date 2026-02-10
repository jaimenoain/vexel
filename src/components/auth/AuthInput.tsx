import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, className = '', ...props }: AuthInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-bold mb-2 uppercase tracking-wide text-[#111111]" htmlFor={props.id}>
        {label}
      </label>
      <input
        className={`w-full border px-3 py-3 focus:outline-none transition-colors ${
          error ? 'border-red-500 focus:border-red-500' : 'border-[#E5E5E5] focus:border-[#111111]'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
