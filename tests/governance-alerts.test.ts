/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/governance-alerts/route';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => {
      return {
        json: async () => data,
        status: options?.status || 200,
      };
    }),
  },
}));

describe('Governance Alerts API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('sorts tasks by priority (CRITICAL > HIGH > MEDIUM > LOW) then created_at', async () => {
    const tasks = [
      { id: 1, priority: 'MEDIUM', created_at: '2023-01-01T10:00:00Z' },
      { id: 2, priority: 'CRITICAL', created_at: '2023-01-01T12:00:00Z' },
      { id: 3, priority: 'LOW', created_at: '2023-01-01T11:00:00Z' },
      { id: 4, priority: 'CRITICAL', created_at: '2023-01-01T13:00:00Z' }, // Newer Critical
    ];

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: tasks, error: null }),
      }),
    });

    const req = new Request('http://localhost/api/dashboard/governance-alerts', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(json).toHaveLength(4);
    expect(json[0].id).toBe(4); // Critical, Newer
    expect(json[1].id).toBe(2); // Critical, Older
    expect(json[2].id).toBe(1); // Medium
    expect(json[3].id).toBe(3); // Low
  });

  it('filters for OPEN tasks', async () => {
    const eqMock = jest.fn().mockResolvedValue({ data: [], error: null });

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: eqMock
      }),
    });

    const req = new Request('http://localhost/api/dashboard/governance-alerts', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    await GET(req);

    expect(mockSupabase.from).toHaveBeenCalledWith('governance_tasks');
    expect(eqMock).toHaveBeenCalledWith('status', 'OPEN');
  });

  it('returns 401 if unauthorized', async () => {
      // No auth header
      const req = new Request('http://localhost/api/dashboard/governance-alerts');
      const res = await GET(req);
      expect(res.status).toBe(401);
  });
});
