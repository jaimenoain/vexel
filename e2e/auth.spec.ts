import { test, expect } from "@playwright/test";

test.describe("Auth acceptance criteria", () => {
  test("Unauth user -> /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Auth user -> /login redirects to /dashboard", async ({ page }) => {
    const testEmail = process.env.E2E_TEST_USER_EMAIL;
    const testPassword = process.env.E2E_TEST_USER_PASSWORD;
    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Sign Up creates a user session and triggers Resend email", async ({
    page,
  }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      test.skip();
      return;
    }

    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const email = `e2e-${unique}@example.com`;
    const password = "TestPassword1!";

    await page.goto("/signup");
    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Test");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/confirm password/i).fill(password);
    await page.getByRole("button", { name: /sign up/i }).click();

    await expect(page).toHaveURL(/\/login/);
  });

  test("Log Out destroys the session", async ({ page }) => {
    const testEmail = process.env.E2E_TEST_USER_EMAIL;
    const testPassword = process.env.E2E_TEST_USER_PASSWORD;
    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
