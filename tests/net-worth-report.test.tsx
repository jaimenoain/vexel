/**
 * @jest-environment node
 */
import React from 'react';
import { GET } from '@/app/api/reports/net-worth/route';
import { createClient } from '@supabase/supabase-js';
import { renderToStream } from '@react-pdf/renderer';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock React PDF
jest.mock('@react-pdf/renderer', () => ({
  renderToStream: jest.fn().mockResolvedValue({
      // Mock readable stream
      [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('PDF_CONTENT');
      }
  }),
}));

// Mock NetWorthStatement component to avoid deep rendering issues and inspect props
jest.mock('@/src/components/reports/NetWorthStatement', () => ({
  NetWorthStatement: (props: any) => React.createElement('NetWorthStatement', props),
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
  });

  it('generates PDF report correctly', async () => {
    // Setup Mock Data
    const balances = [
      { asset_id: 'cash-id', balance: 1000 },
      { asset_id: 'loan-id', balance: -500 },
    ];

    const assets = [
      { id: 'cash-id', name: 'Cash', currency: 'USD', type: 'BANK' },
      { id: 'loan-id', name: 'Loan', currency: 'USD', type: 'BANK' },
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

    const req = new Request('http://localhost/api/reports/net-worth', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="Net_Worth_Statement_');

    expect(renderToStream).toHaveBeenCalled();
  });
});
