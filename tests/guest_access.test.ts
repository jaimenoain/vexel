/**
 * @jest-environment node
 */
import { POST as POST_INVITE } from '@/app/api/invites/route';
import { GET as GET_SESSION } from '@/app/api/guest/session/route';
import { GET as GET_HISTORY } from '@/app/api/assets/[assetId]/history/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Guest Access API', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      rpc: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('POST /api/invites', () => {
    it('creates an invite successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      });

      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ asset_id: 'asset-123', duration_hours: 24 }),
      });

      const res = await POST_INVITE(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.url).toContain('/guest/');
      expect(mockSupabase.from).toHaveBeenCalledWith('guest_invites');
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('returns 401 if unauthorized', async () => {
      const req = new Request('http://localhost/api/invites', {
        method: 'POST',
        body: JSON.stringify({ asset_id: 'asset-123', duration_hours: 24 }),
      });

      const res = await POST_INVITE(req);
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/guest/session', () => {
    it('validates a valid token', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const req = new Request('http://localhost/api/guest/session?token=valid-token');
      const res = await GET_SESSION(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.valid).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('validate_guest_token', { p_token: 'valid-token' });
    });

    it('rejects an invalid token', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      const req = new Request('http://localhost/api/guest/session?token=invalid-token');
      const res = await GET_SESSION(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.valid).toBe(false);
    });
  });

  describe('GET /api/assets/[assetId]/history', () => {
    it('returns history for authenticated user', async () => {
      const mockData = [
        {
          amount: 100,
          type: 'DEBIT',
          ledger_transactions: { id: 'txn1', date: '2023-01-01', description: 'Test' },
        },
      ];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      });

      const req = new Request('http://localhost/api/assets/asset-123/history', {
        headers: { Authorization: 'Bearer user-token' },
      });
      const params = Promise.resolve({ assetId: 'asset-123' });

      const res = await GET_HISTORY(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json[0].id).toBe('txn1');
      expect(json[0].amount).toBe(100);
      expect(mockSupabase.from).toHaveBeenCalledWith('ledger_lines');
    });

    it('returns history for guest user', async () => {
      const mockData = [
        { id: 'txn1', date: '2023-01-01', description: 'Test', amount: 100, type: 'DEBIT' },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const req = new Request('http://localhost/api/assets/asset-123/history', {
        headers: { 'x-guest-token': 'guest-token' },
      });
      const params = Promise.resolve({ assetId: 'asset-123' });

      const res = await GET_HISTORY(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json[0].id).toBe('txn1');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_guest_asset_history', {
        p_asset_id: 'asset-123',
        p_token: 'guest-token',
      });
    });

    it('returns 401 if no auth', async () => {
      const req = new Request('http://localhost/api/assets/asset-123/history');
      const params = Promise.resolve({ assetId: 'asset-123' });

      const res = await GET_HISTORY(req, { params });
      expect(res.status).toBe(401);
    });
  });
});
