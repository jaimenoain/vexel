import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper to load envs
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
          const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function runMockVerification() {
    console.log('\n--- Running Mock Verification of API Logic ---');
    console.log('Simulating Supabase response...');

    const mockOwnerId = 'owner-uuid';
    const mockAssets = [
        { id: '1', owner_id: mockOwnerId, name: 'Asset 1' },
        { id: '2', owner_id: mockOwnerId, name: 'Asset 2' },
    ];

    console.log('Mock Data:', mockAssets);

    // Logic from app/api/directory/route.ts
    const entitiesMap = new Map<string, { entity_id: string; assets: any[] }>();

    mockAssets.forEach((asset) => {
      if (!entitiesMap.has(asset.owner_id)) {
        entitiesMap.set(asset.owner_id, {
          entity_id: asset.owner_id,
          assets: [],
        });
      }
      entitiesMap.get(asset.owner_id)!.assets.push({
        ...asset,
        net_worth: 0,
      });
    });

    const result = Array.from(entitiesMap.values());
    console.log('Transformed Result:', JSON.stringify(result, null, 2));

    // Verifications
    let passed = true;

    // Structure Check
    if (result.length === 1 && result[0].entity_id === mockOwnerId && result[0].assets.length === 2) {
        console.log('PASS: Structure is Entity -> Assets[]');
    } else {
        console.error('FAIL: Structure mismatch');
        passed = false;
    }

    // Placeholder Check
    const asset1 = result[0].assets.find((a: any) => a.id === '1');
    if (asset1 && asset1.net_worth === 0) {
        console.log('PASS: Placeholder net_worth: 0 is present');
    } else {
        console.error('FAIL: net_worth placeholder missing');
        passed = false;
    }

    if (passed) {
        console.log('Mock Verification: PASSED');
    } else {
        console.error('Mock Verification: FAILED');
        process.exit(1);
    }
}

async function runLiveVerification() {
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        console.error('Missing required environment variables for Live Verification (need SERVICE_ROLE_KEY).');
        return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log('\n--- Running Live RLS Verification ---');
    const timestamp = Date.now();
    const ownerEmail = `qa_owner_${timestamp}@test.com`;
    const viewerEmail = `qa_viewer_${timestamp}@test.com`;
    const password = 'password123';

    let ownerId: string | undefined;
    let viewerId: string | undefined;
    let assetPublicId: string;
    let assetSecretId: string;
    let viewerToken: string;

    try {
        // 1. Create Users
        console.log(`Creating users: ${ownerEmail}, ${viewerEmail}`);

        const { data: ownerData, error: ownerError } = await supabaseAdmin.auth.admin.createUser({
            email: ownerEmail,
            password: password,
            email_confirm: true
        });
        if (ownerError) throw ownerError;
        ownerId = ownerData.user.id;

        const { data: viewerData, error: viewerError } = await supabaseAdmin.auth.admin.createUser({
            email: viewerEmail,
            password: password,
            email_confirm: true
        });
        if (viewerError) throw viewerError;
        viewerId = viewerData.user.id;

        // 2. Login as Viewer
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({
            email: viewerEmail,
            password: password,
        });
        if (loginError) throw loginError;
        viewerToken = loginData.session.access_token;

        // 3. Create Assets as Owner
        console.log('Creating assets...');
        const { data: assetPublic, error: apError } = await supabaseAdmin.from('assets').insert({
            name: 'Asset Public',
            owner_id: ownerId
        }).select().single();
        if (apError) throw apError;
        assetPublicId = assetPublic.id;

        const { data: assetSecret, error: asError } = await supabaseAdmin.from('assets').insert({
            name: 'Asset Secret',
            owner_id: ownerId
        }).select().single();
        if (asError) throw asError;
        assetSecretId = assetSecret.id;

        // 4. Grant Access
        console.log('Granting access...');
        const { error: grantError } = await supabaseAdmin.from('access_grants').insert({
            asset_id: assetPublicId,
            user_id: viewerId,
            access_level: 'VIEW'
        });
        if (grantError) throw grantError;

        // 5. Test RLS as Viewer
        console.log('Verifying RLS...');
        const viewerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${viewerToken}` } }
        });

        const { data: assets, error: queryError } = await viewerClient.from('assets').select('*');
        if (queryError) throw queryError;

        console.log('Assets fetched by Viewer:', assets.map(a => a.name));

        // Checks
        const hasPublic = assets.find(a => a.id === assetPublicId);
        const hasSecret = assets.find(a => a.id === assetSecretId);

        if (!hasPublic) {
            console.error('FAIL: Public asset not found in response.');
            process.exit(1);
        } else {
            console.log('PASS: Public asset is visible.');
        }

        if (hasSecret) {
            console.error('FAIL: Secret asset LEAKED in response!');
            process.exit(1);
        } else {
            console.log('PASS: Secret asset is hidden.');
        }

        console.log('Live Verification: PASSED');

    } catch (err) {
        console.error('Unexpected error during live verification:', err);
        process.exit(1);
    } finally {
        // Cleanup
        if (ownerId) await supabaseAdmin.auth.admin.deleteUser(ownerId);
        if (viewerId) await supabaseAdmin.auth.admin.deleteUser(viewerId);
    }
}

async function main() {
    if (serviceRoleKey) {
        await runLiveVerification();
        // Also run mock to be sure of the transformation logic
        runMockVerification();
    } else {
        console.warn('SUPABASE_SERVICE_ROLE_KEY not found. Skipping Live RLS Verification.');
        console.warn('To run live verification, ensure SUPABASE_SERVICE_ROLE_KEY is set in .env');
        runMockVerification();
    }
}

main();
