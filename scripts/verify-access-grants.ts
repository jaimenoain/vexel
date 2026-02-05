import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Env loader
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

async function verifyAccessGrants() {
  console.log('Starting Access Grants QA Review...');

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
      console.warn('[WARN] Connectivity: No DATABASE_URL found. Skipping live verification.');
      console.log('       To run the SQL checks, please ensure .env contains a valid DATABASE_URL.');
      return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[PASS] Connectivity: Database is accessible.');

    // 1. Existence Check
    console.log('1. Checking Existence...');

    // Check table
    const tableRes = await client.query("SELECT to_regclass('public.access_grants');");
    if (tableRes.rows[0].to_regclass) {
         console.log('[PASS] Table `access_grants` exists.');
    } else {
         console.error('[FAIL] Table `access_grants` MISSING.');
    }

    // Check type
    const typeRes = await client.query("SELECT 1 FROM pg_type WHERE typname = 'app_permission';");
    if (typeRes.rowCount && typeRes.rowCount > 0) {
        console.log('[PASS] Type `app_permission` exists.');
    } else {
        console.error('[FAIL] Type `app_permission` MISSING.');
    }

    // 2. & 3. Uniqueness and Integrity via SQL DO block
    console.log('2. & 3. Running SQL DO block for Uniqueness and Referential Integrity...');

    // We use a transaction to roll back changes after test
    await client.query('BEGIN');

    const testSql = `
    DO $$
    DECLARE
        v_user_id UUID;
        v_asset_id UUID;
    BEGIN
        -- 1. Insert dummy user and asset
        -- Attempt to insert into auth.users. This might require being superuser or replication role
        -- or similar depending on Supabase config.
        -- If this fails, we catch the error in the surrounding block.

        INSERT INTO auth.users (id, email)
        VALUES (gen_random_uuid(), 'test_qa_' || gen_random_uuid() || '@example.com')
        RETURNING id INTO v_user_id;

        -- Insert dummy asset
        INSERT INTO public.assets (name, owner_id, currency)
        VALUES ('Test Asset', v_user_id, 'USD') -- Added currency 'USD' as per memory constraint
        RETURNING id INTO v_asset_id;

        -- 2. Insert an access grant
        INSERT INTO public.access_grants (asset_id, user_id, access_level)
        VALUES (v_asset_id, v_user_id, 'VIEW');

        -- 3. Attempt insert second grant
        BEGIN
            INSERT INTO public.access_grants (asset_id, user_id, access_level)
            VALUES (v_asset_id, v_user_id, 'EDIT');

            RAISE EXCEPTION 'Constraint Missing: Duplicate grant was allowed!';
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'SUCCESS: Unique constraint caught the duplicate.';
        END;

        -- 4. Test Referential Integrity
        -- Delete user
        DELETE FROM auth.users WHERE id = v_user_id;

        -- Check if grant is gone
        IF EXISTS (SELECT 1 FROM public.access_grants WHERE asset_id = v_asset_id AND user_id = v_user_id) THEN
            RAISE EXCEPTION 'Referential Integrity Fail: Grant not deleted after user deletion.';
        ELSE
            RAISE NOTICE 'SUCCESS: Grant deleted (Cascade) after user deletion.';
        END IF;

    END $$;
    `;

    try {
        await client.query(testSql);
        console.log('[PASS] SQL DO block executed successfully. Constraints verified.');
    } catch (err: any) {
        console.error(`[FAIL] SQL DO block failed: ${err.message}`);
        // If it failed because of auth.users permission, we should note that.
        if (err.message.includes('permission denied') && err.message.includes('auth.users')) {
            console.log('       (Note: Inserting into auth.users requires admin/superuser privileges)');
        }
    } finally {
        await client.query('ROLLBACK');
    }

  } catch (err: any) {
    console.error(`[FAIL] Error: ${err.message}`);
  } finally {
    await client.end();
  }
}

verifyAccessGrants().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
