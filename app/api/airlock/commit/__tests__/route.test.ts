/**
 * @jest-environment node
 */
import { POST } from '../route';
import { createClient } from '@supabase/supabase-js';
import { matchGhostEntries } from '@/lib/ghost-entries/matching-service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/ghost-entries/matching-service', () => ({
  matchGhostEntries: jest.fn(),
}));

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

describe('POST /api/airlock/commit', () => {
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc = jest.fn();
    (createClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
    });
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
    const data = await res.json();
    expect(data.error).toBe('Missing Authorization header');
  });

  it('calls rpc successfully', async () => {
    mockRpc.mockResolvedValue({ data: 'txn-uuid', error: null });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ id: 'test-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.transactionId).toBe('txn-uuid');

    expect(createClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        global: { headers: { Authorization: 'Bearer valid-token' } },
      })
    );

    expect(mockRpc).toHaveBeenCalledWith('commit_airlock_item', { item_id: 'test-uuid' });
  });

  it('returns 400 if rpc returns validation error', async () => {
    // Simulate a business logic error from RPC
    mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Item status must be REVIEW_NEEDED' }
    });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ id: 'test-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Item status must be REVIEW_NEEDED');
  });

  it('returns 500 if rpc returns internal error', async () => {
    // Simulate generic DB error
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Database connection failed' } });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ id: 'test-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Database connection failed');
  });

  it('calls matchGhostEntries when rpc succeeds and returns ID', async () => {
    mockRpc.mockResolvedValue({ data: 'txn-123', error: null });
    (matchGhostEntries as jest.Mock).mockResolvedValue({ matchedCount: 1, errors: [] });

    const req = new Request('http://localhost/api/airlock/commit', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ id: 'test-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.transactionId).toBe('txn-123');

    expect(matchGhostEntries).toHaveBeenCalledWith('txn-123');
  });

  it('does NOT call matchGhostEntries if rpc fails', async () => {
     mockRpc.mockResolvedValue({ data: null, error: { message: 'Some error' } });

     const req = new Request('http://localhost/api/airlock/commit', {
       method: 'POST',
       headers: { Authorization: 'Bearer valid-token' },
       body: JSON.stringify({ id: 'test-uuid' }),
     });

     const res = await POST(req);
     expect(matchGhostEntries).not.toHaveBeenCalled();
  });
});
