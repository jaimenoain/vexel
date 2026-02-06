import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id in request body' }, { status: 400 });
    }

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

    // 1. Fetch item to validate traffic_light status
    const { data: item, error: fetchError } = await supabase
      .from('airlock_items')
      .select('status, traffic_light')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching airlock item:', fetchError);
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    if (item.traffic_light === 'RED') {
      return NextResponse.json({ error: 'Cannot commit items with RED status' }, { status: 400 });
    }

    // 2. Update status to COMMITTED
    const { error: updateError } = await supabase
      .from('airlock_items')
      .update({ status: 'COMMITTED' })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating airlock item:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
