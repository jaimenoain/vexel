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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase URL or Anon Key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createUser(prefix: string) {
  console.log(`Attempting to sign in anonymously for ${prefix}...`);
  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();

  if (!anonError && anonData.user) {
      console.log(`Created anonymous user: ${anonData.user.id}`);
      return { user: anonData.user, session: anonData.session };
  }

  console.log('Anonymous sign-in failed, trying email signup:', anonError?.message);

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
    console.log('--- Starting Directory API Verification ---');

    // 1. Create User A (Owner)
    console.log('Creating User A...');
    const userA = await createUser('user-a');

    // 2. Create User B (Viewer)
    console.log('Creating User B...');
    const userB = await createUser('user-b');

    // Client for User A
    const clientA = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userA.session?.access_token}` } }
    });

    // 3. User A creates "Public Asset"
    console.log('User A creating Public Asset...');
    const { data: publicAsset, error: createError1 } = await clientA
        .from('assets')
        .insert({ name: 'Public Asset', owner_id: userA.user.id })
        .select()
        .single();
    if (createError1) throw createError1;
    console.log('Public Asset created:', publicAsset.id);

    // 4. User A creates "Private Asset"
    console.log('User A creating Private Asset...');
    const { data: privateAsset, error: createError2 } = await clientA
        .from('assets')
        .insert({ name: 'Private Asset', owner_id: userA.user.id })
        .select()
        .single();
    if (createError2) throw createError2;
    console.log('Private Asset created:', privateAsset.id);

    // 5. User A grants VIEW access to User B for "Public Asset"
    console.log('User A granting VIEW access to User B for Public Asset...');
    const { error: grantError } = await clientA
        .from('access_grants')
        .insert({
            asset_id: publicAsset.id,
            user_id: userB.user.id,
            access_level: 'VIEW'
        });
    if (grantError) throw grantError;
    console.log('Access granted.');

    // 6. User B calls GET /api/directory
    console.log('User B calling GET /api/directory...');
    const response = await fetch('http://localhost:3000/api/directory', {
        headers: {
            'Authorization': `Bearer ${userB.session?.access_token}`
        }
    });

    if (response.status !== 200) {
        throw new Error(`Endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    // 7. Verify Response Structure
    if (!Array.isArray(data)) {
        throw new Error('Response is not an array');
    }

    // Find Entity for User A
    const entityA = data.find((e: any) => e.entity_id === userA.user.id);
    if (!entityA) {
        throw new Error('Entity for User A not found in response');
    }

    // Verify Assets
    const assets = entityA.assets;
    if (!Array.isArray(assets)) {
        throw new Error('Assets is not an array');
    }

    const foundPublic = assets.find((a: any) => a.id === publicAsset.id);
    const foundPrivate = assets.find((a: any) => a.id === privateAsset.id);

    if (!foundPublic) {
        throw new Error('Public Asset NOT found in response');
    }
    if (foundPrivate) {
        throw new Error('Private Asset FOUND in response (Security Leak!)');
    }

    // Verify Placeholder
    if (foundPublic.net_worth !== 0) {
        throw new Error(`Asset does not have net_worth: 0. Found: ${foundPublic.net_worth}`);
    }

    console.log('--- Verification Complete: PASSED ---');

  } catch (err: any) {
    console.error('Test Failed:', err.message);
    process.exit(1);
  }
}

runTest();
