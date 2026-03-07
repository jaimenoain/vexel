import { test, expect } from "@playwright/test";

test.describe("QA: Auth regression", () => {
  test("Middleware ignores static assets and does not redirect", async ({
    page,
  }) => {
    await page.goto("/favicon.ico");
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Login form: empty email shows Zod validation error and does not call server action", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText(/email is required|invalid email/i)
    ).toBeVisible();
  });

  test("Login form: invalid email does not call server action (stays on /login)", async ({
    page,
  }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel(/email/i);
    await emailInput.evaluate((el: HTMLInputElement) => {
      el.setAttribute("type", "text");
    });
    await emailInput.fill("not-an-email");
    await page.getByLabel(/password/i).fill("any");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("No redirect loop: unauthenticated /login stays on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /log in/i })).toBeVisible();
  });
});
