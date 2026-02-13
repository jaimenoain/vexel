import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

// Proxy pattern to allow import without keys, but throw on usage
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    if (!client) {
        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables for Admin Client. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file.');
        }
        client = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return (client as any)[prop];
  }
});
