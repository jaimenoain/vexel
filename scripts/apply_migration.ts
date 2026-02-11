import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env loader
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

async function applyMigration() {
    console.log('--- Applying Migration 0036 ---');

    if (!process.env.DATABASE_URL) {
        console.warn('WARN: DATABASE_URL not found. Skipping migration application.');
        console.warn('      Please apply database/migrations/0036_documents_module.sql manually.');
        return;
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const sqlPath = path.resolve(__dirname, '../database/migrations/0036_documents_module.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        console.log('SUCCESS: Migration 0036 applied successfully.');
    } catch (err: any) {
        console.error('ERROR: Failed to apply migration:', err.message);
    } finally {
        await client.end();
    }
}

applyMigration();
