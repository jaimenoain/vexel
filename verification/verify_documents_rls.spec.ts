import { test, expect } from '@playwright/test';

test.describe('Documents Module Security', () => {
  test('Unauthenticated access to API should be denied', async ({ request }) => {
    // 1. Try to list documents without auth
    const listRes = await request.get('http://localhost:3000/api/documents', {
        maxRedirects: 0 // Don't follow redirect
    });

    // Middleware redirects to /login, so status should be 307
    expect(listRes.status()).toBe(307);
    expect(listRes.headers()['location']).toContain('/login');

    // 2. Try to download without auth
    const downloadRes = await request.get('http://localhost:3000/api/documents/123/download', {
        maxRedirects: 0
    });

    expect(downloadRes.status()).toBe(307);
    expect(downloadRes.headers()['location']).toContain('/login');
  });
});
