import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: assets, error } = await supabase.from('assets').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to Entity -> Assets[] hierarchy
  // Entity is identified by owner_id
  const entitiesMap = new Map<string, { entity_id: string; assets: any[] }>();

  assets.forEach((asset) => {
    if (!entitiesMap.has(asset.owner_id)) {
      entitiesMap.set(asset.owner_id, {
        entity_id: asset.owner_id,
        assets: [],
      });
    }
    entitiesMap.get(asset.owner_id)!.assets.push({
      ...asset,
      net_worth: 0, // Placeholder requirement
    });
  });

  const result = Array.from(entitiesMap.values());

  return NextResponse.json(result);
}
