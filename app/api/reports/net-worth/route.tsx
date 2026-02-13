import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { NetWorthStatement, NetWorthReportData } from '@/src/components/reports/NetWorthStatement';
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

    // 1. Get User to verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Asset Balances from View
    const { data: balances, error: balanceError } = await supabase
      .from('view_asset_balances')
      .select('asset_id, balance');

    if (balanceError) {
      console.error('Error fetching asset balances:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch asset balances' }, { status: 500 });
    }

    // 3. Fetch Asset Details (name, type, currency)
    const assetIds = balances?.map((b: any) => b.asset_id) || [];
    let assets: any[] = [];

    if (assetIds.length > 0) {
      const { data: fetchedAssets, error: assetError } = await supabase
        .from('assets')
        .select('id, name, type, currency')
        .in('id', assetIds);

      if (assetError) {
        console.error('Error fetching asset details:', assetError);
        return NextResponse.json({ error: 'Failed to fetch asset details' }, { status: 500 });
      }
      assets = fetchedAssets || [];
    }

    // Map assets by ID
    const assetMap = new Map<string, any>();
    assets.forEach((a: any) => assetMap.set(a.id, a));

    // 4. Process Data
    const assetGroupsMap = new Map<string, { groupName: string; items: { name: string; value: number }[]; total: number }>();
    const liabilityGroupsMap = new Map<string, { groupName: string; items: { name: string; value: number }[]; total: number }>();

    let totalAssets = 0;
    let totalLiabilities = 0;

    if (balances) {
      for (const item of balances) {
        const asset = assetMap.get(item.asset_id);
        if (!asset) continue;

        // Exclude EQUITY type
        if (asset.type === 'EQUITY') continue;

        const balance = Number(item.balance);
        const currency = asset.currency || 'USD';

        // Convert to USD
        const valueInUSD = CurrencyService.normalizeToUserBase(balance, currency, 'USD');

        if (valueInUSD > 0) {
          // Asset
          totalAssets += valueInUSD;

          const groupName = getGroupName(asset.type, false);
          if (!assetGroupsMap.has(groupName)) {
            assetGroupsMap.set(groupName, { groupName, items: [], total: 0 });
          }
          const group = assetGroupsMap.get(groupName)!;
          group.items.push({ name: asset.name, value: valueInUSD });
          group.total += valueInUSD;
        } else if (valueInUSD < 0) {
          // Liability (store absolute value)
          const absValue = Math.abs(valueInUSD);
          totalLiabilities += absValue;

          const groupName = getGroupName(asset.type, true);
          if (!liabilityGroupsMap.has(groupName)) {
            liabilityGroupsMap.set(groupName, { groupName, items: [], total: 0 });
          }
          const group = liabilityGroupsMap.get(groupName)!;
          group.items.push({ name: asset.name, value: absValue });
          group.total += absValue;
        }
      }
    }

    const netEquity = totalAssets - totalLiabilities;
    const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const reportData: NetWorthReportData = {
      reportDate,
      currency: 'USD',
      totalAssets,
      totalLiabilities,
      netEquity,
      assetGroups: Array.from(assetGroupsMap.values()),
      liabilityGroups: Array.from(liabilityGroupsMap.values()),
    };

    // 5. Generate PDF Stream
    const stream = await renderToStream(<NetWorthStatement data={reportData} />);

    // Convert Node stream to Web stream for NextResponse
    const webStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    // 6. Return Response
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Net_Worth_Statement_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Unexpected error in net-worth report endpoint:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function getGroupName(type: string, isLiability: boolean): string {
  switch (type) {
    case 'BANK':
      return isLiability ? 'Loans & Credit' : 'Cash & Equivalents';
    case 'PROPERTY':
      return isLiability ? 'Mortgages / Property Debt' : 'Real Estate';
    default:
      return isLiability ? 'Other Liabilities' : 'Other Assets';
  }
}
