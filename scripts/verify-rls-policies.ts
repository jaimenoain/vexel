import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyRLS() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.warn('⚠️  DATABASE_URL is not set. Skipping live RLS verification.');
    console.warn('To verify manually, please apply migration 0007 and run the following SQL checks:');
    console.log(`
    -- 1. Create a user and try to select assets (should fail without grant)
    -- 2. Create an asset (should succeed and auto-grant OWNER)
    -- 3. Verify grant exists in access_grants
    -- 4. Try to update asset (should succeed as OWNER)
    -- 5. Try to view entity (should succeed if asset grant exists)
    `);
    // Exit successfully as we cannot perform the check in this environment
    return;
  }

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Inspect the schema to ensure policies exist.
    const res = await client.query(`
      SELECT policyname, tablename, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      AND (tablename = 'assets' OR tablename = 'entities');
    `);

    console.log('Checking Active Policies:');
    const policies = res.rows;

    const requiredPolicies = [
      { table: 'assets', name: 'Users can view assets', cmd: 'SELECT' },
      { table: 'assets', name: 'Users can create assets', cmd: 'INSERT' },
      { table: 'assets', name: 'Users can update assets', cmd: 'UPDATE' },
      { table: 'assets', name: 'Owners can delete assets', cmd: 'DELETE' },
      { table: 'entities', name: 'Users can view entities', cmd: 'SELECT' }
    ];

    let allFound = true;
    for (const req of requiredPolicies) {
      const found = policies.find(p => p.tablename === req.table && p.policyname === req.name && p.cmd === req.cmd);
      if (found) {
        console.log(`✅ Found policy: "${req.name}" on ${req.table} for ${req.cmd}`);
      } else {
        console.error(`❌ Missing policy: "${req.name}" on ${req.table} for ${req.cmd}`);
        allFound = false;
      }
    }

    // Check for Trigger
    const triggerRes = await client.query(`
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'assets'
        AND trigger_name = 'on_asset_created';
    `);

    if (triggerRes.rows.length > 0) {
        console.log("✅ Trigger 'on_asset_created' found on 'assets' table.");
    } else {
        console.error("❌ Trigger 'on_asset_created' MISSING.");
        allFound = false;
    }

    if (allFound) {
        console.log("\nRLS Setup Verification Passed (Schema Check).");
    } else {
        console.error("\nRLS Verification Failed.");
        process.exit(1);
    }

  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyRLS();
