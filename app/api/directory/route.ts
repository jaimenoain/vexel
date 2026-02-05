import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildDirectoryTree } from '@/lib/directory';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.json({ error: 'Internal Server Configuration Error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Query entities and their associated assets.
  // RLS will ensure:
  // 1. Entities are only returned if the user has access to at least one asset in them.
  // 2. The nested 'assets' array only contains assets the user has access to.
  const { data, error } = await supabase
    .from('entities')
    .select('*, assets(*)')
    .order('name'); // Order entities by name for consistent UI

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = buildDirectoryTree(data || []);

  return NextResponse.json(result);
}
