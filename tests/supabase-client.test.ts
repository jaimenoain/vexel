
describe('Supabase Client Initialization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not throw error when env vars are missing', () => {
    expect(() => {
      const { createClient } = require('@/lib/supabase/client');
      const client = createClient();
      expect(client).toBeDefined();
    }).not.toThrow();
  });
});
