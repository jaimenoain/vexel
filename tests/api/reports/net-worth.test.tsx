/**
 * @jest-environment node
 */
import { GET } from '@/app/api/reports/net-worth/route';
import { createClient } from '@supabase/supabase-js';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock React PDF
jest.mock('@react-pdf/renderer', () => ({
  renderToStream: jest.fn(),
  Document: ({ children }: any) => React.createElement('div', null, children),
  Page: ({ children }: any) => React.createElement('div', null, children),
  Text: ({ children }: any) => React.createElement('div', null, children),
  View: ({ children }: any) => React.createElement('div', null, children),
  StyleSheet: { create: (styles: any) => styles },
}));

// Mock CurrencyService
jest.mock('@/lib/currency-service', () => ({
  CurrencyService: {
    normalizeToUserBase: jest.fn((amount) => amount), // 1:1 conversion for simplicity
  },
}));

describe('Net Worth Report API', () => {
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

    // Mock renderToStream to return a simple async iterator
    (renderToStream as jest.Mock).mockResolvedValue({
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from('PDF Content');
      },
    });

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
  });

  it('returns 401 if Authorization header is missing', async () => {
    const req = new Request('http://localhost/api/reports/net-worth');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 and PDF stream on success', async () => {
    const balances = [
      { asset_id: 'asset1', balance: 1000 },
      { asset_id: 'liab1', balance: -500 },
    ];
    const assets = [
      { id: 'asset1', name: 'Asset 1', type: 'BANK', currency: 'USD' },
      { id: 'liab1', name: 'Liability 1', type: 'BANK', currency: 'USD' },
    ];

    mockSupabase.from = jest.fn((table: string) => {
      if (table === 'view_asset_balances') {
        return {
          select: jest.fn().mockResolvedValue({ data: balances, error: null }),
        };
      }
      if (table === 'assets') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: assets, error: null }),
          }),
        };
      }
      return { select: jest.fn() };
    });

    const req = new Request('http://localhost/api/reports/net-worth', {
      headers: { Authorization: 'Bearer token' },
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toMatch(/filename="Net_Worth_Statement_\d{4}-\d{2}-\d{2}\.pdf"/);
  });
});
