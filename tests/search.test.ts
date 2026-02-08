/**
 * @jest-environment node
 */
import { GET } from '@/app/api/search/route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Global Search API', () => {
  let mockSupabase: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key' };

    mockSupabase = {
      rpc: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
      process.env = originalEnv;
  });

  it('returns 400 if search query is missing', async () => {
    const req = new Request('http://localhost/api/search', {
        headers: { Authorization: 'Bearer token' }
    });
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Search query is required');
  });

  it('returns 401 if Authorization header is missing', async () => {
      const req = new Request('http://localhost/api/search?q=test');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Missing Authorization header');
  });

  it('returns 500 if Supabase client init fails (missing env vars)', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_URL;

      const req = new Request('http://localhost/api/search?q=test', {
          headers: { Authorization: 'Bearer token' }
      });
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('Internal Server Configuration Error');
  });

  it('calls search_global RPC and returns data on success', async () => {
    const mockData = [
        { id: '1', type: 'ASSET', label: 'Aspen Condo', details: 'PROPERTY - USD', url_path: '/assets/1' }
    ];
    mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

    const req = new Request('http://localhost/api/search?q=Aspen', {
        headers: { Authorization: 'Bearer token' }
    });
    const res = await GET(req);
    const json = await res.json();

    expect(createClient).toHaveBeenCalledWith(
        'https://example.com',
        'key',
        expect.objectContaining({ global: { headers: { Authorization: 'Bearer token' } } })
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith('search_global', { search_term: 'Aspen' });
    expect(res.status).toBe(200);
    expect(json).toEqual(mockData);
  });

  it('returns 500 on database error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

      const req = new Request('http://localhost/api/search?q=Aspen', {
          headers: { Authorization: 'Bearer token' }
      });
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe('DB Error');
  });
});
