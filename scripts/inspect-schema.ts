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

async function inspectSchema() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
      console.error('No DATABASE_URL found.');
      process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    console.log('--- Tables ---');
    const tablesRes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('entities', 'assets')
      ORDER BY table_name, ordinal_position;
    `);
    console.table(tablesRes.rows);

    console.log('\n--- Enums ---');
    const enumsRes = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `);
    console.table(enumsRes.rows);

  } catch (err) {
    console.error('Error inspecting schema:', err);
  } finally {
    await client.end();
  }
}

inspectSchema();
