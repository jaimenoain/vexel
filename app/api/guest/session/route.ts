import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Internal Server Configuration Error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Call RPC to validate token
    const { data: isValid, error } = await supabase.rpc('validate_guest_token', { p_token: token });

    if (error) {
      console.error('Error validating token:', error);
      return NextResponse.json({ error: 'Failed to validate token' }, { status: 500 });
    }

    if (!isValid) {
      return NextResponse.json({ valid: false, message: 'Invalid or expired token' }, { status: 401 });
    }

    // Token is valid. Frontend can store it.
    // We could set a cookie here, but prompt says "This might involve signing a temporary JWT or setting a session cookie marked as 'Guest Role'".
    // Since we are returning JSON, the frontend can handle storage (localStorage or cookie).
    // For "Statelessness", passing the token in headers for subsequent requests is preferred.
    // So just return valid: true.

    return NextResponse.json({ valid: true, token: token });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
