import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Documents Module', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Auth Session
    await page.addInitScript(() => {
        window.localStorage.setItem('sb-dyadqaccvdsislghpolv-auth-token', JSON.stringify({
            access_token: 'mock-token',
            refresh_token: 'mock-refresh',
            user: {
                id: 'mock-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'test@example.com'
            }
        }));
    });

    // Mock Auth API calls to prevent real network requests
    await page.route('**/auth/v1/user', async route => {
         await route.fulfill({
            status: 200,
            body: JSON.stringify({
                id: 'mock-user-id',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'test@example.com'
            })
         });
    });

    await page.route('**/auth/v1/session', async route => {
         await route.fulfill({
            status: 200,
            body: JSON.stringify({
                access_token: 'mock-token',
                expires_in: 3600,
                refresh_token: 'mock-refresh',
                user: {
                    id: 'mock-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: 'test@example.com'
                }
            })
         });
    });

    // Mock Download API (always returns signed url)
    await page.route('**/api/documents/*/download', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/mock-signed-url.pdf' })
      });
    });
  });

  test('User can upload and download a document', async ({ page }) => {
    // State to simulate DB persistence across requests
    let uploaded = false;

    // Mock List API
    await page.route('**/api/documents', async route => {
        if (route.request().method() === 'GET') {
            if (!uploaded) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([])
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        {
                            id: 'doc-new',
                            name: 'Contract.pdf',
                            size: 1024, // 1 KB
                            created_at: new Date().toISOString(),
                            file_path: 'documents/user/uuid/contract.pdf'
                        }
                    ])
                });
            }
        } else {
            await route.continue();
        }
    });

    // Mock Upload API
    await page.route('**/api/documents/upload', async route => {
        if (route.request().method() === 'POST') {
            uploaded = true; // Update state
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  id: 'doc-new',
                  name: 'Contract.pdf',
                  size: 1024,
                  created_at: new Date().toISOString(),
                  file_path: 'documents/user/uuid/contract.pdf'
                })
            });
        } else {
            await route.continue();
        }
    });

    // Navigate to Documents page
    await page.goto('http://localhost:3000/documents');

    // Assert Header and Empty State
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByText('Storage Only - No Parsing')).toBeVisible();
    await expect(page.getByText('No documents uploaded yet.')).toBeVisible();

    // Perform Upload
    const buffer = Buffer.from('mock pdf content');
    const fileInput = page.locator('[data-testid="documents-upload-input"]');

    await fileInput.setInputFiles({
      name: 'Contract.pdf',
      mimeType: 'application/pdf',
      buffer
    });

    // Wait for list to update (List should now contain the file)
    await expect(page.getByText('Contract.pdf')).toBeVisible();
    await expect(page.getByText('1 KB')).toBeVisible();

    // Take Screenshot
    await page.screenshot({ path: 'verification/documents_list.png' });

    // Click Download
    const downloadPromise = page.waitForEvent('popup');
    await page.getByTitle('Download').click();
    const popup = await downloadPromise;

    // Verify Popup URL
    // Note: In some environments, the popup might load about:blank first, so we wait for load
    await popup.waitForLoadState();
    // Use regex because there might be trailing slash or params
    expect(popup.url()).toContain('example.com/mock-signed-url.pdf');
  });
});
