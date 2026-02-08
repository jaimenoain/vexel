import { createClient } from '@supabase/supabase-js';

// Mock next/server before importing route
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      json: async () => body,
      status: init?.status || 200,
    })),
  },
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Import GET after mocks
import { GET } from '../route';

// Mock Request if not available
if (typeof Request === 'undefined') {
  global.Request = class Request {
    headers: Headers;
    url: string;
    constructor(input: string, init?: any) {
      this.url = input;
      this.headers = new Headers(init?.headers);
    }
  } as any;

  global.Headers = class Headers {
    private map: Map<string, string>;
    constructor(init?: Record<string, string>) {
      this.map = new Map(Object.entries(init || {}));
    }
    get(name: string) {
      return this.map.get(name) || null;
    }
  } as any;
}

// Mock process.env
const originalEnv = process.env;

describe('GET /api/dashboard/net-worth', () => {
  let mockSupabase: any;
  let request: Request;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, NEXT_PUBLIC_SUPABASE_URL: 'http://localhost', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key' };

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    request = new Request('http://localhost/api/dashboard/net-worth', {
      headers: { Authorization: 'Bearer test-token' },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 401 if Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/dashboard/net-worth');
    const response = await GET(req);
    expect(response.status).toBe(401);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth error') });

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 0 net worth if no balances found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'view_asset_balances') {
        return {
          select: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis() };
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ net_worth: 0, currency: 'USD' });
  });

  it('should calculate net worth correctly with currency conversion', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    // Mock view_asset_balances
    const mockBalances = [
      { asset_id: 'asset1', balance: 100 }, // USD
      { asset_id: 'asset2', balance: 100 }, // EUR -> 108 USD
    ];

    // Mock assets
    const mockAssets = [
      { id: 'asset1', currency: 'USD' },
      { id: 'asset2', currency: 'EUR' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'view_asset_balances') {
        return {
          select: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
        };
      }
      if (table === 'assets') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: mockAssets, error: null }),
          }),
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    // 100 + 108 = 208
    expect(body.net_worth).toBe(208);
    expect(body.currency).toBe('USD');
  });

  it('should default to USD if currency is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user1' } }, error: null });

    const mockBalances = [{ asset_id: 'asset1', balance: 100 }];
    const mockAssets: any[] = []; // Empty assets

    mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'view_asset_balances') {
          return {
            select: jest.fn().mockResolvedValue({ data: mockBalances, error: null }),
          };
        }
        if (table === 'assets') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: mockAssets, error: null }),
            }),
          };
        }
        return { select: jest.fn().mockReturnThis() };
      });

    const response = await GET(request);
    const body = await response.json();

    expect(body.net_worth).toBe(100); // 100 USD (default) -> 100
  });
});
