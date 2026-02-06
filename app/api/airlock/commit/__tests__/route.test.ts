/**
 * @jest-environment node
 */
import { POST } from '../route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('POST /api/airlock/commit', () => {
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockSelectEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockUpdateEq: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingle = jest.fn();
    mockSelectEq = jest.fn(() => ({ single: mockSingle }));
    mockSelect = jest.fn(() => ({ eq: mockSelectEq }));

    mockUpdateEq = jest.fn();
    mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    mockFrom = jest.fn(() => ({ select: mockSelect, update: mockUpdate }));

    (createClient as jest.Mock).mockReturnValue({
      from: mockFrom,
    });

    // Default env vars for test
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns 400 if id is missing', async () => {
    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing id in request body');
  });

  it('returns 401 if Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      body: JSON.stringify({ id: '123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 if item status is RED', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'REVIEW_NEEDED', traffic_light: 'RED' },
      error: null,
    });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: JSON.stringify({ id: '123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Cannot commit items with RED status');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates status to COMMITTED if item is GREEN', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'REVIEW_NEEDED', traffic_light: 'GREEN' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: JSON.stringify({ id: '123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockUpdate).toHaveBeenCalledWith({ status: 'COMMITTED' });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', '123');
  });

  it('updates status to COMMITTED if item is YELLOW', async () => {
    mockSingle.mockResolvedValue({
      data: { status: 'REVIEW_NEEDED', traffic_light: 'YELLOW' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
      body: JSON.stringify({ id: '123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
