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

// Set default if not found
if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not found in env files. Trying default local Supabase URL...');
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
}

async function verifyConnection() {
    console.log(`Connecting to: ${process.env.DATABASE_URL}`);
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    try {
        await client.connect();
        console.log('Successfully connected to database!');
        const res = await client.query('SELECT version();');
        console.log('Postgres Version:', res.rows[0].version);
        await client.end();
    } catch (err: any) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

verifyConnection();
