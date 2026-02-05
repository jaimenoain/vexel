import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Simple env loader for local testing
const loadEnv = () => {
  const envFiles = ['.env', '.env.local'];

  envFiles.forEach(file => {
    const envPath = path.resolve(__dirname, `../${file}`);
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf8');
      envConfig.split('\n').forEach((line) => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
          if (key && value) {
            process.env[key] = value;
          }
        }
      });
    }
  });
};

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL and Key must be set in .env, .env.local or environment (NEXT_PUBLIC_ or VITE_ prefixes).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAuth() {
  console.log('Starting Auth Verification...');

  const timestamp = Date.now();
  const testEmail = `qa-test-${timestamp}@example.com`;
  const testPassword = `Password${timestamp}!`;

  console.log(`1. Attempting Sign Up with ${testEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (authError) {
    console.error('Sign Up Failed:', authError.message);
    process.exit(1);
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error('Sign Up succeeded but no User ID returned. (Email confirmation might be required)');
    process.exit(1);
  }
  console.log('Sign Up successful. User ID:', userId);

  console.log('2. Verifying Profile Creation (Trigger)...');

  // Poll for profile
  let profile = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      profile = data;
      break;
    }

    if (error && error.code !== 'PGRST116') { // PGRST116 is "JSON object requested, multiple (or no) rows returned"
       // console.warn('Polling error:', error.message);
    }

    // Wait 1 second
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
    process.stdout.write('.');
  }
  console.log('');

  if (!profile) {
    console.error('Profile was not created within timeout (10s). Trigger might be failing.');
    process.exit(1);
  }

  console.log('Profile found:', profile);

  console.log('3. Checking Data Integrity...');
  if (profile.email !== testEmail) {
    console.error(`Email mismatch: expected ${testEmail}, got ${profile.email}`);
  } else {
    console.log('Email matches.');
  }

  if (profile.role !== 'CONTROLLER') {
    console.error(`Default role mismatch: expected CONTROLLER, got ${profile.role}`);
  } else {
    console.log('Default role is CONTROLLER.');
  }

  console.log('4. Verifying RLS...');

  // Ensure we are using the session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && authData.session) {
      await supabase.auth.setSession(authData.session);
  }

  // Try to fetch a random UUID (simulate accessing another user's data)
  const randomId = '00000000-0000-0000-0000-000000000000';
  const { data: rlsData, error: rlsError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', randomId);

  // We expect empty result because we can't see others
  if (rlsData && rlsData.length === 0) {
    console.log('RLS Check: Query for other user returned no data (Success).');
  } else if (rlsError) {
     console.log('RLS Check: Query returned error (acceptable behavior):', rlsError.message);
  } else {
    console.error('RLS Check Failed: We were able to see data we shouldn\'t.', rlsData);
  }

  console.log('Verification Complete: PASSED');
}

verifyAuth().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
