/**
 * @jest-environment node
 */
import { POST } from '../app/api/airlock/commit/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase Client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock Next.js environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

describe('Airlock Commit Double-Click Simulation (Idempotency)', () => {
  let mockRpc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc = jest.fn();
    (createClient as jest.Mock).mockReturnValue({
      rpc: mockRpc,
    });
  });

  it('should handle rapid double-click (concurrent requests) by invoking RPC twice and returning 200 OK for both', async () => {
    // 1. Setup Mock
    // We simulate that the RPC call succeeds (returning null error)
    // The actual locking logic (FOR UPDATE) is in SQL, so we trust the DB to handle the serialization.
    // If the first one commits, the second one will see status='COMMITTED' and return VOID (success).
    // So both RPC calls should return { error: null }.
    mockRpc.mockResolvedValue({ data: null, error: null });

    // 2. Prepare Requests
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({ id: 'test-uuid-123' }),
    };

    const req1 = new Request('http://localhost/api/airlock/commit', requestOptions);
    const req2 = new Request('http://localhost/api/airlock/commit', requestOptions);

    // 3. Execute Concurrent Requests
    console.log('Simulating double-click...');
    const [res1, res2] = await Promise.all([
      POST(req1),
      POST(req2),
    ]);

    // 4. Verification
    // Both responses should be 200 OK because the RPC is designed to be idempotent
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.success).toBe(true);
    expect(body2.success).toBe(true);

    // Verify RPC was called twice (once for each request)
    // The DB handles the race condition, preventing double ledger entries.
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledWith('commit_airlock_item', { item_id: 'test-uuid-123' });

    console.log('✅ Double-click simulation passed: Both requests returned 200 OK.');
  });
});
