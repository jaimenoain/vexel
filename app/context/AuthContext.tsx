'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type SignUpParams = {
  email: string;
  password: string;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (params: SignUpParams) => Promise<AuthResponse>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password }: SignUpParams) => {
    return await supabase.auth.signUp({
      email,
      password,
    });
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
