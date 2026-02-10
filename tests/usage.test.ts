/**
 * @jest-environment node
 */
import { GET } from '@/app/api/usage/route';
import { createClient } from '@supabase/supabase-js';
import { FREE_TIER_LIMIT } from '@/lib/constants';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Usage API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('returns usage status correctly when under limit', async () => {
    // Mock count = 3 (under limit 5)
    mockSupabase.select.mockResolvedValue({ count: 3, error: null });

    const req = new Request('http://localhost/api/usage', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      current_count: 3,
      limit: FREE_TIER_LIMIT,
      is_over_limit: false,
      plan_name: 'Free Tier',
    });
  });

  it('returns usage status correctly when over limit', async () => {
    // Mock count = 6 (over limit 5)
    mockSupabase.select.mockResolvedValue({ count: 6, error: null });

    const req = new Request('http://localhost/api/usage', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      current_count: 6,
      limit: FREE_TIER_LIMIT,
      is_over_limit: true,
      plan_name: 'Free Tier',
    });
  });

  it('returns usage status correctly when at limit', async () => {
    // Mock count = 5 (at limit 5)
    mockSupabase.select.mockResolvedValue({ count: 5, error: null });

    const req = new Request('http://localhost/api/usage', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      current_count: 5,
      limit: FREE_TIER_LIMIT,
      is_over_limit: false, // 5 is not > 5
      plan_name: 'Free Tier',
    });
  });

  it('handles database errors', async () => {
    mockSupabase.select.mockResolvedValue({ count: null, error: { message: 'DB Error' } });

    const req = new Request('http://localhost/api/usage', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain('Failed to fetch asset usage: DB Error');
  });

  it('returns 401 if missing Authorization header', async () => {
    const req = new Request('http://localhost/api/usage', {
      headers: {},
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Missing Authorization header');
  });
});
