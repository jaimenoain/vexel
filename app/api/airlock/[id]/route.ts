import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
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

  // Fetch the item
  const { data: item, error } = await supabase
    .from('airlock_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Generate signed URL
  let signedUrl = null;
  if (item.file_path) {
    const { data: urlData, error: urlError } = await supabase
      .storage
      .from('raw-documents')
      .createSignedUrl(item.file_path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Storage error:', urlError);
      // We don't fail the whole request, but we might want to indicate the URL failed
    } else {
      signedUrl = urlData?.signedUrl;
    }
  }

  return NextResponse.json({
    ...item,
    url: signedUrl,
  });
}
