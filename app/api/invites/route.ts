import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Internal Server Configuration Error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { asset_id, duration_hours } = body;

    if (!asset_id || !duration_hours) {
      return NextResponse.json({ error: 'Missing required fields: asset_id, duration_hours' }, { status: 400 });
    }

    // Generate secure token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + parseInt(duration_hours));

    // Insert invite
    // RLS should ensure the user has EDITOR/OWNER rights to the asset
    const { error: insertError } = await supabase
      .from('guest_invites')
      .insert({
        asset_id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id
      });

    if (insertError) {
      console.error('Error creating invite:', insertError);
      return NextResponse.json({ error: 'Failed to create invite. Ensure you have permission.' }, { status: 403 });
    }

    // Construct URL
    // Assuming the frontend is hosted at the same origin as the API, or use a configured base URL.
    // For now, return a relative path or construct full URL if origin is available.
    // In server-side environments, request.url gives the full URL.
    const url = new URL(request.url);
    const origin = url.origin;
    const inviteUrl = `${origin}/guest/${inviteToken}`;

    return NextResponse.json({ url: inviteUrl, expires_at: expiresAt });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
