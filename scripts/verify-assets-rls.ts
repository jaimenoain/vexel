import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env
const loadEnv = () => {
  const files = ['.env.local', '.env'];
  for (const file of files) {
      const envPath = path.resolve(__dirname, `../${file}`);
      if (fs.existsSync(envPath)) {
        console.log(`Loading env from ${file}`);
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach((line) => {
          const parts = line.split('=');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (key && value) {
              process.env[key] = value;
            }
          }
        });
      }
  }
};

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase URL or Anon Key.');
  process.exit(1);
}

// We use the anon key for everything, relying on Auth to establish identity
console.log('Using Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUser(prefix: string) {
  const timestamp = Date.now();
  const email = `${prefix}${timestamp}@example.com`;
  const password = `Password${timestamp}!`;

  console.log(`Attempting to sign up with email: ${email}`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('SignUp Error Details:', JSON.stringify(error, null, 2));
    throw error;
  }
  if (!data.user) throw new Error('No user returned');

  return { user: data.user, session: data.session, email, password };
}

async function runTest() {
  try {
    console.log('--- Starting Assets RLS Verification ---');

    // 1. Create User A
    console.log('Creating User A...');
    const userA = await createUser('user-a');
    console.log(`User A created: ${userA.user.id}`);

    // 2. Create User B
    console.log('Creating User B...');
    const userB = await createUser('user-b');
    console.log(`User B created: ${userB.user.id}`);

    // Client for User A
    const clientA = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userA.session?.access_token}` } }
    });

    // Client for User B
    const clientB = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userB.session?.access_token}` } }
    });

    // 3. User A creates an Asset
    console.log('User A creating an asset...');
    const { data: assetData, error: createError } = await clientA
        .from('assets')
        .insert({ name: 'User A Secret Asset', owner_id: userA.user.id })
        .select()
        .single();

    if (createError) {
        throw new Error(`User A failed to create asset: ${createError.message}`);
    }

    const assetId = assetData.id;
    console.log(`Asset created by User A: ${assetId}`);

    // 4. Verify User A can see it
    const { data: dataA, error: errorA } = await clientA
        .from('assets')
        .select('*')
        .eq('id', assetId);

    if (errorA || !dataA || dataA.length === 0) {
        console.error('User A cannot see their own asset!');
    } else {
        console.log('User A can see their asset (Success).');
    }

    // 5. User B attempts to query Asset
    console.log('User B attempting to read User A\'s asset...');
    const { data: dataB, error: errorB } = await clientB
        .from('assets')
        .select('*')
        .eq('id', assetId);

    if (errorB) {
        console.log(`Query returned error (acceptable): ${errorB.message}`);
    } else if (dataB && dataB.length === 0) {
        console.log('User B query returned 0 rows (Success: Data Isolated).');
    } else {
        console.error('FAILURE: User B was able to see the asset:', dataB);
        process.exit(1);
    }

    // 6. User B attempts to UPDATE Asset
    console.log('User B attempting to UPDATE User A\'s asset...');
    const { data: updateData, error: updateError } = await clientB
        .from('assets')
        .update({ name: 'Hacked by B' })
        .eq('id', assetId)
        .select();

    if (updateData && updateData.length > 0) {
         console.error('FAILURE: User B was able to update the asset!');
         process.exit(1);
    } else {
        console.log('User B update affected 0 rows (Success: Write Isolated).');
    }

    // Verify Asset name is unchanged
    const { data: verifyData } = await clientA.from('assets').select('name').eq('id', assetId).single();
    if (verifyData && verifyData.name !== 'User A Secret Asset') {
         console.error('FAILURE: Asset name was changed!');
         process.exit(1);
    } else {
         console.log('Asset verification: Name is unchanged.');
    }

    // 7. User A grants VIEW access to User B
    console.log('User A granting VIEW access to User B...');
    const { error: grantError } = await clientA
        .from('access_grants')
        .insert({
            asset_id: assetId,
            user_id: userB.user.id,
            permission_level: 'READ_ONLY'
        });

    if (grantError) {
        throw new Error(`User A failed to grant access: ${grantError.message}`);
    }
    console.log('Access granted.');

    // 8. User B attempts to query Asset again
    console.log('User B attempting to read User A\'s asset after grant...');
    const { data: dataB_granted, error: errorB_granted } = await clientB
        .from('assets')
        .select('*')
        .eq('id', assetId);

    if (errorB_granted) {
         console.error(`Query returned error (Unexpected): ${errorB_granted.message}`);
         process.exit(1);
    } else if (dataB_granted && dataB_granted.length === 1) {
        console.log('User B query returned 1 row (Success: Access Granted).');
    } else {
        console.error('FAILURE: User B still cannot see the asset after grant:', dataB_granted);
        process.exit(1);
    }

    console.log('--- Verification Complete: PASSED ---');

  } catch (err: any) {
    console.error('Test Failed:', err.message);
    if (err.message.includes('relation "public.assets" does not exist') || err.message.includes('column "owner_id" of relation "assets" does not exist')) {
        console.error('NOTE: This failure is expected if the migration has not been applied to the remote database.');
    }
    process.exit(1);
  }
}

runTest();
