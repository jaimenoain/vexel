import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: document, error: dbError } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (dbError || !document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const { data, error: signError } = await supabaseAdmin.storage
    .from('raw-documents')
    .createSignedUrl(document.file_path, 60 * 60);

  if (signError || !data) {
    console.error('Sign error:', signError);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
