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

async function runValidation() {
  console.log('--- Running Migration Validation Script ---');

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
      console.error('Error: DATABASE_URL not found in environment.');
      console.error('Cannot connect to database to run validation.');
      // Exit gracefully so we don't break the build if this is run in CI without DB access
      process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const sqlPath = path.resolve(__dirname, '../database/validate_migration.sql');
    if (!fs.existsSync(sqlPath)) {
        throw new Error(`Validation SQL file not found at ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL validation...');
    // We capture notices to see our RAISE NOTICE output
    client.on('notice', (msg) => console.log('NOTICE:', msg.message));

    await client.query(sql);

    console.log('Validation Script Finished Successfully.');

  } catch (err: any) {
    console.error('Validation Error:', err.message);
    if (err.position) {
        console.error(`Position: ${err.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runValidation();
