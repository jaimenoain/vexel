'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AuthInput } from '@/src/components/auth/AuthInput';
import { AuthButton } from '@/src/components/auth/AuthButton';
import { SimpleToast } from '@/src/components/common/SimpleToast';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn({ email, password });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="w-full">
      <h1 className="text-4xl font-bold mb-8 tracking-tighter text-[#111111]">LOGIN</h1>
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
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </AuthButton>
      </form>
      <div className="mt-6 text-sm">
        <span className="text-gray-500">Don't have an account? </span>
        <Link href="/signup" className="text-[#111111] font-bold hover:underline">
          Sign Up
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
