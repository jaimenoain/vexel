import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const authHeader = request.headers.get('Authorization');
    const guestToken = request.headers.get('x-guest-token');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Internal Server Configuration Error' }, { status: 500 });
    }

    // 1. Authenticated User
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      // Query ledger_lines joined with ledger_transactions
      const { data, error } = await supabase
        .from('ledger_lines')
        .select(`
          amount,
          type,
          ledger_transactions (
            id,
            date,
            description
          )
        `)
        .eq('asset_id', assetId)
        .order('ledger_transactions(date)', { ascending: false });

      if (error) {
        console.error('Error fetching history (User):', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Format to flat structure matching RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const history = data.map((line: any) => ({
        id: line.ledger_transactions?.id,
        date: line.ledger_transactions?.date,
        description: line.ledger_transactions?.description,
        amount: line.amount,
        type: line.type,
      }));

      return NextResponse.json(history);
    }

    // 2. Guest User
    if (guestToken) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Call RPC to get history with guest context
      const { data, error } = await supabase.rpc('get_guest_asset_history', {
        p_asset_id: assetId,
        p_token: guestToken,
      });

      if (error) {
        console.error('Error fetching history (Guest):', error);
        // If RPC fails (e.g. invalid token or RLS violation), it might return an error.
        // We should handle 401/403 specifically if possible, but 500 is safe fallback.
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    // 3. Unauthorized
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
