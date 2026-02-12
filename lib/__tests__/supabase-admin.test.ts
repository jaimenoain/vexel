import { createClient } from '@supabase/supabase-js';

// Mock createClient
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {},
    auth: {},
    from: jest.fn(),
  })),
}));

describe('supabaseAdmin', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // This is crucial to re-evaluate module-level process.env reads
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    // Unset the key
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    // Ensure URL is set so we isolate the key check failure if both are required,
    // but the code checks (!url || !key), so missing either triggers it.
    // Let's set URL to be sure we are testing the Key specifically if possible,
    // or just generally missing variables.
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

    // Import the module freshly
    const { supabaseAdmin } = require('../supabase-admin');

    expect(() => {
      // Accessing a property triggers the proxy handler
      // We access 'storage' which is a common usage
      const _ = supabaseAdmin.storage;
    }).toThrow('Missing Supabase environment variables for Admin Client. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file.');
  });

  it('should create client when SUPABASE_SERVICE_ROLE_KEY is present', () => {
    // Set the key
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';

    // Import the module freshly
    const { supabaseAdmin } = require('../supabase-admin');

    // Accessing a property triggers client creation
    const storage = supabaseAdmin.storage;
    expect(storage).toBeDefined();

    // Check if createClient was called
    const { createClient } = require('@supabase/supabase-js');
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key',
      expect.objectContaining({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    );
  });
});
