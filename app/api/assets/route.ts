import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse Body
    const body = await request.json();
    const { name, type, currency } = body;

    // 3. Validate
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const validTypes = ['BANK', 'PROPERTY', 'EQUITY'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 });
    }
    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      return NextResponse.json({ error: 'Currency must be 3 characters' }, { status: 400 });
    }

    // 4. Create Entity (Bypassing RLS)
    // We create a new Entity container for the Asset.
    const { data: entity, error: entityError } = await supabaseAdmin
      .from('entities')
      .insert({
        name: name, // Use same name as asset
        type: 'HOLDING', // Default type
      })
      .select('id')
      .single();

    if (entityError) {
      console.error('Entity creation error:', entityError);
      return NextResponse.json({ error: entityError.message || 'Failed to create entity container' }, { status: 500 });
    }

    // 5. Create Asset (Bypassing RLS, but setting owner_id)
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .insert({
        entity_id: entity.id,
        owner_id: user.id,
        name: name,
        type: type,
        currency: currency.toUpperCase(),
      })
      .select('*')
      .single();

    if (assetError) {
      console.error('Asset creation error:', assetError);
      // Cleanup entity if asset creation fails to avoid orphans
      await supabaseAdmin.from('entities').delete().eq('id', entity.id);
      return NextResponse.json({ error: assetError.message || 'Failed to create asset' }, { status: 500 });
    }

    return NextResponse.json({ entity_id: entity.id, asset: asset });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
