import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { matchGhostEntries } from '@/lib/ghost-entries/matching-service';

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

    // Call the commit RPC
    // Note: ensure commit_airlock_item returns the transaction UUID
    const { data: transactionId, error } = await supabase.rpc('commit_airlock_item', { item_id: id });

    if (error) {
      console.error('Error executing commit_airlock_item:', error);

      // Determine if it's a validation error (400) or internal error (500)
      // Check for known messages from RPC
      const validationErrors = [
        'Item not found',
        'Item status must be',
        'Cannot commit items with RED status',
        'Invalid payload',
        'No transactions in payload',
        'Invalid date',
        'Invalid amount',
        'Asset',
        'Amount is missing'
      ];

      const isValidationError = validationErrors.some(msg => error.message.includes(msg));
      const status = isValidationError ? 400 : 500;

      return NextResponse.json({ error: error.message }, { status });
    }

    // Ghostbuster Logic: Match Pending Ghost Entries
    let ghostResults = null;
    if (transactionId) {
      try {
        console.log(`Starting ghost matching for transaction ${transactionId}...`);
        ghostResults = await matchGhostEntries(transactionId as string);
        console.log('Ghost matching completed:', ghostResults);
      } catch (matchError) {
        console.error('Error during ghost matching:', matchError);
        // We do not fail the request if matching fails, as the commit was successful
      }
    } else {
        console.warn('commit_airlock_item succeeded but returned no transaction ID. Ghost matching skipped.');
    }

    return NextResponse.json({ success: true, transactionId, ghostResults });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
