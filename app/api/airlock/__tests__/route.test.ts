/**
 * @jest-environment node
 */
import { GET } from '../route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/airlock', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns all items if asset_id is missing', async () => {
    const mockData = [{
      id: '1',
      status: 'QUEUED',
      traffic_light: 'YELLOW',
      confidence_score: 0.85,
      ai_payload: { summary: 'test' },
      created_at: '2023-01-01T00:00:00Z'
    }];
    mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

    const request = new Request('http://localhost:3000/api/airlock', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockData);
    expect(mockSupabase.eq).not.toHaveBeenCalled();
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns 401 if Authorization header is missing', async () => {
    const request = new Request('http://localhost:3000/api/airlock?asset_id=123');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Missing Authorization header');
  });

  it('filters by asset_id when provided', async () => {
    const mockData = [{
      id: '1',
      status: 'QUEUED',
      traffic_light: 'YELLOW',
      confidence_score: 0.85,
      ai_payload: { summary: 'test' },
      created_at: '2023-01-01T00:00:00Z'
    }];
    mockSupabase.order.mockResolvedValue({ data: mockData, error: null });

    const request = new Request('http://localhost:3000/api/airlock?asset_id=123', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(createClient).toHaveBeenCalledWith(
      expect.stringContaining('http'), // Loose check for env vars
      expect.any(String),
      { global: { headers: { Authorization: 'Bearer token' } } }
    );
    expect(mockSupabase.from).toHaveBeenCalledWith('airlock_items');
    expect(mockSupabase.select).toHaveBeenCalledWith('id, status, traffic_light, confidence_score, ai_payload, created_at');
    expect(mockSupabase.eq).toHaveBeenCalledWith('asset_id', '123');
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(response.status).toBe(200);
    expect(data).toEqual(mockData);
  });

  it('returns 500 on database error', async () => {
    mockSupabase.order.mockResolvedValue({ data: null, error: { message: 'DB Error' } });

    const request = new Request('http://localhost:3000/api/airlock', {
      headers: { Authorization: 'Bearer token' },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('DB Error');
  });
});
