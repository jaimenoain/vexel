/**
 * @jest-environment node
 */
import { GET } from '@/app/api/dashboard/net-worth/route';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('Net Worth API', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('calculates net worth correctly excluding Equity (Expenses/Income)', async () => {
    // Setup Mock Data
    const balances = [
      { asset_id: 'cash-id', balance: 1000 },       // Cash (BANK)
      { asset_id: 'equity-id', balance: -1000 },    // Opening Balance (EQUITY)
      { asset_id: 'dinner-id', balance: 100 },      // Dinner Expense (EQUITY)
    ];

    const assets = [
      { id: 'cash-id', currency: 'USD', type: 'BANK' },
      { id: 'equity-id', currency: 'USD', type: 'EQUITY' },
      { id: 'dinner-id', currency: 'USD', type: 'EQUITY' },
    ];

    const fromMock = jest.fn((table: string) => {
        if (table === 'view_asset_balances') {
            return {
                select: jest.fn().mockResolvedValue({ data: balances, error: null })
            };
        }
        if (table === 'assets') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({ data: assets, error: null })
                })
            };
        }
        return { select: jest.fn() };
    });
    mockSupabase.from = fromMock;

    const req = new Request('http://localhost/api/dashboard/net-worth', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.net_worth).toBe(1000);
  });

  it('handles liabilities correctly (negative balance)', async () => {
      const balances = [
          { asset_id: 'cash-id', balance: 1000 },
          { asset_id: 'credit-card-id', balance: -500 }
      ];

      const assets = [
          { id: 'cash-id', currency: 'USD', type: 'BANK' },
          { id: 'credit-card-id', currency: 'USD', type: 'BANK' }
      ];

     const fromMock = jest.fn((table: string) => {
        if (table === 'view_asset_balances') {
            return {
                select: jest.fn().mockResolvedValue({ data: balances, error: null })
            };
        }
        if (table === 'assets') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({ data: assets, error: null })
                })
            };
        }
        return { select: jest.fn() };
    });
    mockSupabase.from = fromMock;

    const req = new Request('http://localhost/api/dashboard/net-worth', {
        headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    expect(json.net_worth).toBe(500);
  });

  it('handles currency conversion (EUR to USD)', async () => {
      const balances = [
          { asset_id: 'eur-cash-id', balance: 1000 },
          { asset_id: 'usd-cash-id', balance: 1000 }
      ];

      const assets = [
          { id: 'eur-cash-id', currency: 'EUR', type: 'BANK' },
          { id: 'usd-cash-id', currency: 'USD', type: 'BANK' }
      ];

     const fromMock = jest.fn((table: string) => {
        if (table === 'view_asset_balances') {
            return {
                select: jest.fn().mockResolvedValue({ data: balances, error: null })
            };
        }
        if (table === 'assets') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({ data: assets, error: null })
                })
            };
        }
        return { select: jest.fn() };
    });
    mockSupabase.from = fromMock;

    const req = new Request('http://localhost/api/dashboard/net-worth', {
        headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);
    const json = await res.json();

    // Expected:
    // EUR 1000 * 1.08 = 1080 USD.
    // USD 1000 * 1.00 = 1000 USD.
    // Total = 2080 USD.

    expect(json.net_worth).toBeCloseTo(2080, 0);
  });
});
