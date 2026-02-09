/**
 * @jest-environment node
 */
import { POST } from '@/app/api/invites/route';
import { GET } from '@/app/api/guest/session/route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Auditor Guest Access API', () => {
  let mockSupabase: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.com',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
    };

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      rpc: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('POST /api/invites', () => {
    it('returns 401 if Authorization header is missing', async () => {
      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Missing Authorization header');
    });

    it('returns 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } });

      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 if required fields are missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });

      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing required fields: asset_id, duration_hours');
    });

    it('creates an invite successfully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null });
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: mockInsert });

      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ asset_id: 'asset-id', duration_hours: 48 }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.url).toContain('/guest/');
      expect(json.expires_at).toBeDefined();

      // Verify expiration calculation (approximate)
      const expiresAt = new Date(json.expires_at);
      const now = new Date();
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(48, 0.1);

      // Verify Supabase insert call
      expect(mockSupabase.from).toHaveBeenCalledWith('guest_invites');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        asset_id: 'asset-id',
        created_by: 'user-id',
        token: expect.any(String),
        expires_at: expect.any(String),
      }));
    });
  });

  describe('GET /api/guest/session', () => {
    it('returns 400 if token is missing', async () => {
      const req = new Request('http://localhost/api/guest/session');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('Missing token parameter');
    });

    it('returns 401 if token is invalid', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const req = new Request('http://localhost/api/guest/session?token=invalid');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.valid).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_guest_token', { p_token: 'invalid' });
    });

    it('returns 200 and valid: true if token is valid', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const req = new Request('http://localhost/api/guest/session?token=valid');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.valid).toBe(true);
      expect(json.token).toBe('valid');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_guest_token', { p_token: 'valid' });
    });
  });
});
