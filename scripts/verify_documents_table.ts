import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function verifyTable() {
    console.log('--- Verifying Documents Table ---');

    if (!process.env.DATABASE_URL) {
        console.warn('WARN: DATABASE_URL not found. Skipping verification.');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'documents';
        `);

        if (res.rows.length > 0) {
            console.log('SUCCESS: Documents table exists.');
        } else {
            console.error('ERROR: Documents table DOES NOT exist.');
        }
    } catch (err: any) {
        console.error('ERROR: Database connection failed:', err.message);
    } finally {
        await client.end();
    }
}

verifyTable();
