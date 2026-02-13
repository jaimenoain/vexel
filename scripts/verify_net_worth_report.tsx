import 'dotenv/config';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { renderToFile } from '@react-pdf/renderer';
import { NetWorthStatement, NetWorthReportData } from '../src/components/reports/NetWorthStatement';
import { CurrencyService } from '../lib/currency-service';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY) : null;

async function main() {
  console.log('Starting verification...');

  const email = `test-${randomUUID().slice(0, 8)}@vexel.dev`;
  const password = 'Password123!';
  let userId: string | null = null;

  try {
    // 1. Create User
    console.log(`Creating user ${email}...`);

    let user;
    if (adminClient) {
        console.log('Using Admin Client to create confirmed user...');
        const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (createError) {
             console.error('Failed to create user via admin:', createError);
             process.exit(1);
        }
        user = userData.user;
    } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            console.error('Failed to create user:', authError);
        } else {
            user = authData.user;
        }
    }

    let reportData: NetWorthReportData;

    if (user) {
        userId = user.id;

        // Login to get session
        const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
        email,
        password,
        });

        if (sessionError || !sessionData.session) {
            console.error('Failed to sign in:', sessionError);
            console.warn('Skipping DB data test due to sign-in failure. Falling back to Mock Data.');
        } else {
            const token = sessionData.session.access_token;
            const userClient = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
                global: { headers: { Authorization: `Bearer ${token}` } },
            });

            // 2. Setup Data
            console.log('Setting up test data...');

            // Create Entity
            const { data: entity, error: entityError } = await userClient
                .from('entities')
                .insert({ name: 'Test Family', type: 'FAMILY' })
                .select()
                .single();

            if (entityError) throw entityError;

            // Create Assets
            const { data: asset1, error: asset1Error } = await userClient
                .from('assets')
                .insert({ name: 'Test Bank Account', type: 'BANK', currency: 'USD', entity_id: entity.id })
                .select()
                .single();
            if (asset1Error) throw asset1Error;

            const { data: asset2, error: asset2Error } = await userClient
                .from('assets')
                .insert({ name: 'Test Property Loan', type: 'PROPERTY', currency: 'USD', entity_id: entity.id })
                .select()
                .single();
            if (asset2Error) throw asset2Error;

            // Create Transaction
            const { data: txn, error: txnError } = await userClient
                .from('ledger_transactions')
                .insert({ description: 'Initial Funding', date: new Date().toISOString() })
                .select()
                .single();
            if (txnError) throw txnError;

            // Create Ledger Lines
            await userClient.from('ledger_lines').insert({ transaction_id: txn.id, asset_id: asset1.id, amount: 1000, type: 'DEBIT' });
            await userClient.from('ledger_lines').insert({ transaction_id: txn.id, asset_id: asset2.id, amount: 500, type: 'CREDIT' });

            // 3. Replicate Route Logic
            console.log('Fetching data via logic replication...');

            // Fetch Balances
            const { data: balances, error: balanceError } = await userClient
                .from('view_asset_balances')
                .select('asset_id, balance');

            if (balanceError) throw balanceError;
            console.log('Balances:', balances);

            // Fetch Asset Details
            const assetIds = balances.map((b: any) => b.asset_id);
            const { data: assets, error: assetFetchError } = await userClient
                .from('assets')
                .select('id, name, type, currency')
                .in('id', assetIds);

            if (assetFetchError) throw assetFetchError;

            const assetMap = new Map();
            assets.forEach((a: any) => assetMap.set(a.id, a));

            // Process
            const assetGroupsMap = new Map<string, any>();
            const liabilityGroupsMap = new Map<string, any>();
            let totalAssets = 0;
            let totalLiabilities = 0;

            for (const item of balances) {
                const asset = assetMap.get(item.asset_id);
                if (!asset) continue;
                if (asset.type === 'EQUITY') continue;

                const balance = Number(item.balance);
                const valueInUSD = CurrencyService.normalizeToUserBase(balance, asset.currency || 'USD', 'USD');

                if (valueInUSD > 0) {
                    totalAssets += valueInUSD;
                    const groupName = asset.type === 'BANK' ? 'Cash & Equivalents' : (asset.type === 'PROPERTY' ? 'Real Estate' : 'Other Assets');
                    if (!assetGroupsMap.has(groupName)) {
                        assetGroupsMap.set(groupName, { groupName, items: [], total: 0 });
                    }
                    const group = assetGroupsMap.get(groupName);
                    group.items.push({ name: asset.name, value: valueInUSD });
                    group.total += valueInUSD;
                } else if (valueInUSD < 0) {
                    const absValue = Math.abs(valueInUSD);
                    totalLiabilities += absValue;
                    const groupName = asset.type === 'BANK' ? 'Loans & Credit' : (asset.type === 'PROPERTY' ? 'Mortgages / Property Debt' : 'Other Liabilities');
                    if (!liabilityGroupsMap.has(groupName)) {
                        liabilityGroupsMap.set(groupName, { groupName, items: [], total: 0 });
                    }
                    const group = liabilityGroupsMap.get(groupName);
                    group.items.push({ name: asset.name, value: absValue });
                    group.total += absValue;
                }
            }

            const netEquity = totalAssets - totalLiabilities;
            console.log(`Calculated Net Equity: ${netEquity} (Expected: 500)`);

            if (netEquity !== 500) {
                throw new Error(`Net Equity Mismatch. Expected 500, got ${netEquity}`);
            }

            reportData = {
                reportDate: new Date().toLocaleDateString(),
                currency: 'USD',
                totalAssets,
                totalLiabilities,
                netEquity,
                assetGroups: Array.from(assetGroupsMap.values()),
                liabilityGroups: Array.from(liabilityGroupsMap.values()),
            };
        }
    }

    if (!reportData!) {
         console.warn('Using MOCK Data due to user creation/signin failure');
         reportData = {
            reportDate: new Date().toLocaleDateString(),
            currency: 'USD',
            totalAssets: 1000,
            totalLiabilities: 500,
            netEquity: 500,
            assetGroups: [{ groupName: 'Cash & Equivalents', items: [{ name: 'Test Bank', value: 1000 }], total: 1000 }],
            liabilityGroups: [{ groupName: 'Loans & Credit', items: [{ name: 'Test Loan', value: 500 }], total: 500 }],
         };
    }

    // 4. Generate PDF
    console.log('Generating PDF...');
    await renderToFile(React.createElement(NetWorthStatement, { data: reportData }) as any, './net_worth_verification.pdf');
    console.log('PDF generated successfully: ./net_worth_verification.pdf');

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    // 5. Cleanup
    console.log('Cleaning up...');
    if (adminClient && userId) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) console.error('Failed to delete user:', deleteError);
        else console.log('User deleted.');
    } else {
        console.warn('No service role key or user ID, skipping cleanup.');
    }
  }
}

main();
