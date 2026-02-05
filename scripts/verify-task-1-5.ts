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

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL) as string;
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase URL or Anon Key.');
  process.exit(1);
}

// Use Service Role if available to bypass rate limits
const adminClient = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUser(prefix: string) {
  const timestamp = Date.now();
  const email = `${prefix}${timestamp}@example.com`;
  const password = `Password${timestamp}!`;

  console.log(`Creating user: ${email}`);

  if (adminClient) {
      const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true
      });
      if (error) throw error;
      // We need to sign in to get a session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
       if (signInError) throw signInError;
       return { user: signInData.user!, session: signInData.session!, email, password };
  } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('rate limit')) {
             console.error(`\nRate Limit Hit for ${email}.`);
             console.error("To bypass this, set SUPABASE_SERVICE_ROLE_KEY in .env");
        }
        throw error;
      }
      if (!data.user) throw new Error('No user returned');

      // If session is missing (email confirmation required), try to sign in (might fail if confirm needed)
      if (!data.session) {
           console.log("No session returned (Confirmation likely needed). Attempting sign in...");
           const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
               email,
               password
           });
           if (loginError || !loginData.session) {
               throw new Error(`Could not get session for ${email}. Ensure Email Confirmations are disabled or use Service Role Key.`);
           }
           return { user: loginData.user!, session: loginData.session, email, password };
      }

      return { user: data.user, session: data.session, email, password };
  }
}

async function runTest() {
  try {
    console.log('--- Starting Task 1.5 RLS Verification (Data Isolation) ---');

    // 1. Create Users
    console.log('\n1. Creating Users...');
    const owner = await createUser('owner');
    console.log(`   Owner created: ${owner.user.id}`);

    // Slight delay to avoid burst limits if creating consecutively
    await new Promise(r => setTimeout(r, 500));

    const userA = await createUser('user-a');
    console.log(`   User A created: ${userA.user.id}`);

    await new Promise(r => setTimeout(r, 500));

    const userB = await createUser('user-b');
    console.log(`   User B created: ${userB.user.id}`);

    // Clients
    const clientOwner = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${owner.session?.access_token}` } }
    });
    const clientA = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userA.session?.access_token}` } }
    });
    const clientB = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userB.session?.access_token}` } }
    });

    // 2. Owner creates Asset
    console.log('\n2. Owner creating Asset...');
    const { data: assetData, error: createError } = await clientOwner
        .from('assets')
        .insert({ name: 'Confidential Asset', owner_id: owner.user.id })
        .select()
        .single();

    if (createError) throw new Error(`Owner failed to create asset: ${createError.message}`);
    const assetId = assetData.id;
    console.log(`   Asset created: ${assetId}`);

    // 3. Assign Asset to User A in AccessGrants
    console.log('\n3. Assigning Asset to User A in AccessGrants...');
    const { error: grantError } = await clientOwner
        .from('access_grants')
        .insert({
            asset_id: assetId,
            user_id: userA.user.id,
            permission_level: 'READ_ONLY'
        });

    if (grantError) throw new Error(`Failed to grant access: ${grantError.message}`);
    console.log('   Access granted to User A.');

    // 4. Verify User A can see it (Sanity Check)
    console.log('\n4. Verifying User A access...');
    const { data: dataA } = await clientA.from('assets').select('*').eq('id', assetId);
    if (!dataA || dataA.length === 0) {
        throw new Error('User A cannot see the asset even after grant!');
    }
    console.log('   User A can see the asset (Confirmed).');

    // 5. Verify User B CANNOT see it (The Requirement)
    console.log('\n5. Verifying User B isolation (Read Check)...');
    console.log('   Attempting to query Asset as User B...');
    const { data: dataB, error: errorB } = await clientB
        .from('assets')
        .select('*')
        .eq('id', assetId);

    if (dataB && dataB.length > 0) {
        console.error('   FAILURE: User B was able to see the asset!');
        process.exit(1);
    } else {
        console.log('   Success: User B query returned 0 rows.');
    }

    // 6. Verify User B CANNOT update it (The Requirement)
    console.log('\n6. Verifying User B isolation (Write Check)...');
    console.log('   Attempting to UPDATE Asset as User B...');
    const { data: updateData, error: updateError } = await clientB
        .from('assets')
        .update({ name: 'Hacked' })
        .eq('id', assetId)
        .select();

    if (updateData && updateData.length > 0) {
         console.error('   FAILURE: User B was able to update the asset!');
         process.exit(1);
    } else {
        console.log('   Success: User B update affected 0 rows.');
    }

    console.log('\n--- Verification Complete: PASSED ---');

  } catch (err: any) {
    console.error('\nTest Failed:', err.message);
    process.exit(1);
  }
}

runTest();
