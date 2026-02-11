'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AuthInput } from '@/src/components/auth/AuthInput';
import { AuthButton } from '@/src/components/auth/AuthButton';
import { SimpleToast } from '@/src/components/common/SimpleToast';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="w-full text-center">
        <h1 className="text-4xl font-bold mb-4 tracking-tighter text-[#111111]">CHECK YOUR EMAIL</h1>
        <p className="text-gray-600 mb-8">
          We&apos;ve sent a confirmation link to <span className="font-bold">{email}</span>.
          <br />
          Please click the link to verify your account.
        </p>
        <Link href="/login" className="text-[#111111] font-bold hover:underline">
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold mb-8 tracking-tighter text-[#111111]">SIGN UP</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthInput
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="user@example.com"
        />
        <AuthInput
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
        <AuthButton type="submit" disabled={loading}>
          {loading ? 'SIGNING UP...' : 'SIGN UP'}
        </AuthButton>
      </form>
      <div className="mt-6 text-sm">
        <span className="text-gray-500">Already have an account? </span>
        <Link href="/login" className="text-[#111111] font-bold hover:underline">
          Sign In
        </Link>
      </div>
      {error && (
        <SimpleToast
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
    </div>
  );
}
