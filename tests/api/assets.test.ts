import { POST } from '@/app/api/assets/route';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

// Mock supabaseAdmin
jest.mock('@/lib/supabase-admin', () => {
  return {
    supabaseAdmin: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    },
  };
});

// Mock Next.js globals if needed, but NextResponse relies on them.
// We can mock NextResponse to avoid dealing with internal Request/Response classes.
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((body, init) => ({
        json: async () => body,
        status: init?.status || 200,
      })),
    },
  };
});


describe('POST /api/assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 500 if supabaseAdmin throws due to missing keys', async () => {
    // Simulate missing keys by making the mock throw on access
    (supabaseAdmin.auth.getUser as jest.Mock).mockImplementation(() => {
        throw new Error('Missing Supabase environment variables for Admin Client. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file.');
    });

    const request = {
      headers: {
        get: () => 'Bearer token',
      },
      json: async () => ({ name: 'Test Asset', type: 'BANK', currency: 'USD' }),
    } as unknown as Request;

    const response = await POST(request);

    // Since we mocked NextResponse.json, response is the object we returned
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({ error: 'Missing Supabase environment variables for Admin Client. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local file.' });
  });
});
