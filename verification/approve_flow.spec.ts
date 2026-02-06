import { test, expect } from '@playwright/test';

test.describe('Airlock Approve Flow', () => {
  const mockRedItem = {
    id: 'red-item-1',
    status: 'REVIEW_NEEDED',
    traffic_light: 'RED',
    ai_payload: {
      transactions: [{ description: 'Suspicious Vendor', amount: '100.00', date: '2023-01-01' }]
    }
  };

  const mockGreenItem = {
    id: 'green-item-1',
    status: 'REVIEW_NEEDED',
    traffic_light: 'GREEN',
    ai_payload: {
      transactions: [{ description: 'Trusted Vendor', amount: '50.00', date: '2023-01-01' }]
    }
  };

  test('Guardrail Check and Successful Approval', async ({ page }) => {
    // 1. Mock the List API
    await page.route('**/api/airlock?*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockRedItem, mockGreenItem]),
      });
    });

    // 2. Mock the Commit API
    await page.route('**/api/airlock/commit', async route => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Ensure we are not committing the Red item
      if (postData.id === mockRedItem.id) {
        await route.fulfill({ status: 400, body: JSON.stringify({ error: 'Cannot commit RED item' }) });
        return;
      }

      if (postData.id === mockGreenItem.id) {
         await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
         return;
      }
    });

    // 3. Navigate to Mobile QA page (assuming mobile viewport)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/airlock/qa-mobile'); // Adjust URL as needed

    // 4. Guardrail Check: Verify Red Item Button is Disabled
    const redItemCard = page.locator(`text=${mockRedItem.ai_payload.transactions[0].description}`).locator('..').locator('..');
    // Button always has aria-label="Approve"
    const redApproveBtn = redItemCard.getByRole('button', { name: 'Approve' });

    await expect(redApproveBtn).toBeDisabled();
    await expect(redApproveBtn).toHaveAttribute('title', /Cannot approve/);
    // Ensure clicking it does nothing (visual check + api spy)
    await redApproveBtn.click({ force: true });

    // 5. State Transition: Approve Green Item
    const greenItemCard = page.locator(`text=${mockGreenItem.ai_payload.transactions[0].description}`).locator('..').locator('..');
    const greenApproveBtn = greenItemCard.getByRole('button', { name: 'Approve' });

    await expect(greenApproveBtn).toBeEnabled();

    // Setup request listener to verify API call
    const commitRequestPromise = page.waitForRequest(req =>
      req.url().includes('/api/airlock/commit') &&
      req.method() === 'POST'
    );

    await greenApproveBtn.click();

    const request = await commitRequestPromise;
    expect(request.postDataJSON()).toEqual({ id: mockGreenItem.id });

    // 6. Visual Feedback: Verify item removal
    // First, verify the animation class if possible, or just wait for removal
    await expect(greenItemCard).toHaveClass(/opacity-0/); // Assuming animation happens
    await expect(greenItemCard).toBeHidden({ timeout: 1000 });
  });
});
