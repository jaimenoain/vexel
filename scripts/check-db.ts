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

async function checkDb() {
  console.log('Starting DB Quality Assurance Review...');

  // 1. Structure Check
  const migrationsDir = path.resolve(__dirname, '../database/migrations');
  if (fs.existsSync(migrationsDir)) {
      console.log('[PASS] Structure: Migrations folder exists.');
  } else {
      console.error('[FAIL] Structure: Migrations folder MISSING.');
  }

  // Check for DATABASE_URL
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
      console.error('[FAIL] Connectivity: No DATABASE_URL or POSTGRES_URL found in environment.');
      console.log('       Please ensure .env or .env.local contains a valid connection string.');
      console.log('       Example: DATABASE_URL="postgres://postgres:password@db.ref.supabase.co:5432/postgres"');
      process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[PASS] Connectivity: Database is accessible.');

    // 2. Version Check
    const versionRes = await client.query('SELECT version();');
    console.log(`[PASS] Version: ${versionRes.rows[0].version}`);

    // 3. Extensions Check
    const requiredExtensions = ['uuid-ossp', 'pgcrypto', 'vector'];
    const extRes = await client.query('SELECT extname FROM pg_extension;');
    const installedExtensions = extRes.rows.map(row => row.extname);

    const missingExtensions = requiredExtensions.filter(ext => !installedExtensions.includes(ext));

    if (missingExtensions.length === 0) {
        console.log('[PASS] Extensions: All required extensions are enabled.');
    } else {
        console.warn(`[WARN] Extensions: Missing ${missingExtensions.join(', ')}. Attempting to enable...`);
        for (const ext of missingExtensions) {
            try {
                await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}";`);
                console.log(`       Enabled extension: ${ext}`);
            } catch (err: any) {
                console.error(`[FAIL] Extensions: Failed to enable ${ext}: ${err.message}`);
            }
        }
        // Re-check
        const recheckExt = await client.query('SELECT extname FROM pg_extension;');
        const reinstalled = recheckExt.rows.map(row => row.extname);
        const stillMissing = requiredExtensions.filter(ext => !reinstalled.includes(ext));
        if (stillMissing.length === 0) {
             console.log('[PASS] Extensions: All required extensions are now enabled.');
        } else {
             console.error(`[FAIL] Extensions: Still missing ${stillMissing.join(', ')}.`);
        }
    }

    // 4. Timezone Check
    const tzRes = await client.query("SHOW timezone;");
    const currentTimezone = tzRes.rows[0].TimeZone;

    if (currentTimezone.toUpperCase() === 'UTC') {
        console.log('[PASS] Timezone: Database timezone is strictly set to UTC.');
    } else {
        console.warn(`[WARN] Timezone: Database timezone is '${currentTimezone}', expected 'UTC'. Attempting to fix...`);
        try {
            await client.query("ALTER DATABASE postgres SET timezone TO 'UTC';");
             console.log('       Executed ALTER DATABASE ... SET timezone TO \'UTC\'.');
             console.log('       Note: This change may require a database restart or new connections to take full effect.');
        } catch (err: any) {
             console.error(`[FAIL] Timezone: Failed to set timezone to UTC: ${err.message}`);
        }
    }

  } catch (err: any) {
    console.error(`[FAIL] Connection error: ${err.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDb().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
