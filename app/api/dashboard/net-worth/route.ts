import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { CurrencyService } from '@/lib/currency-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

    const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 1. Get User to verify auth (optional but good practice) and potential future preferences
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Asset Balances from View
    // The view respects RLS on ledger_lines, so it only returns balances the user can see.
    const { data: balances, error: balanceError } = await supabase
      .from('view_asset_balances')
      .select('asset_id, balance');

    if (balanceError) {
      console.error('Error fetching asset balances:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch asset balances' }, { status: 500 });
    }

    if (!balances || balances.length === 0) {
      return NextResponse.json({ net_worth: 0.0, currency: 'USD' });
    }

    // 3. Fetch Currencies for these Assets
    const assetIds = balances.map((b: any) => b.asset_id);
    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id, currency, type')
      .in('id', assetIds);

    if (assetError) {
      console.error('Error fetching asset currencies:', assetError);
      return NextResponse.json({ error: 'Failed to fetch asset details' }, { status: 500 });
    }

    // Create a map of assetId -> currency and type
    const currencyMap = new Map<string, string>();
    const typeMap = new Map<string, string>();

    assets?.forEach((a: any) => {
      currencyMap.set(a.id, a.currency);
      typeMap.set(a.id, a.type);
    });

    // 4. Calculate Net Worth
    let totalNetWorthUSD = 0;

    for (const item of balances) {
      const balance = Number(item.balance);
      const currency = currencyMap.get(item.asset_id) || 'USD'; // Default to USD if missing
      const type = typeMap.get(item.asset_id);

      // Exclude EQUITY (Expenses, Income, Opening Balance) from Net Worth
      if (type === 'EQUITY') {
        continue;
      }

      // Normalize to USD (User Base Currency assumed USD for V1)
      const normalizedAmount = CurrencyService.normalizeToUserBase(balance, currency, 'USD');
      totalNetWorthUSD += normalizedAmount;
    }

    // 5. Return Response
    // Round to 2 decimal places for display
    const roundedNetWorth = Math.round((totalNetWorthUSD + Number.EPSILON) * 100) / 100;

    return NextResponse.json({
      net_worth: roundedNetWorth,
      currency: 'USD'
    });

  } catch (error) {
    console.error('Unexpected error in net-worth endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
