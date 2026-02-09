# Soft Limit Usage Metering Verification

This document outlines how to verify the Soft Limit Usage Metering logic.

## Prerequisites

*   A running PostgreSQL database with Supabase schema.
*   (Optional) A running Next.js application (`npm run dev`).
*   (Optional) Python 3 with Playwright installed (`pip install playwright` and `playwright install`) for automated UI check.

## 1. Backend Verification (SQL)

The following SQL script creates a test user, inserts 5 assets (reaching the limit), and then attempts to insert a 6th asset (exceeding the limit). It verifies that the insertion is **not blocked** (Soft Limit).

### Instructions:

1.  Connect to your database using a SQL client (e.g., `psql`, Supabase Dashboard).
2.  Run the contents of `verification/verify_soft_limit.sql`.

### Expected Output:

You should see NOTICE messages confirming success:
*   "Created 5 assets successfully."
*   "Created 6th asset successfully. Soft limit enforced correctly (creation allowed)."
*   "All Soft Limit Tests Passed!"

If the script fails, it will raise an EXCEPTION.

## 2. Frontend Verification (UI)

### Automated (Mocked Data)

If you have Python and Playwright installed:

1.  Ensure your Next.js app is running on `http://localhost:3000`.
2.  Run the verification script:
    ```bash
    python3 verification/verify_soft_limit_ui.py
    ```

**What it does:**
*   It launches a browser and navigates to `/portfolio`.
*   It intercepts the `/api/usage` request and mocks a response indicating usage is over the limit (6/5).
*   It checks for the "Plan Limit Exceeded" banner.

**Expected Output:**
*   "SUCCESS: Plan Limit Banner is visible."
*   "SUCCESS: Upgrade button found."

### Manual (Real Data)

If you want to manually verify in the browser with real data:

1.  Log in to the application.
2.  Ensure you have created at least 6 assets. (You can use the SQL script from step 1, but remove the `ROLLBACK` command to persist data).
3.  Navigate to `/portfolio` or `/dashboard`.
4.  **Verify:**
    *   An amber/orange banner appears at the top of the content area.
    *   The text reads "Plan Limit Exceeded. You are tracking X of 5 free assets...".
    *   There is an "Upgrade" button.
5.  **Persistence Check:**
    *   Refresh the page.
    *   Verify the banner reappears.

## 3. Regression Check (Under Limit)

1.  Ensure you have 5 or fewer assets.
2.  Navigate to `/portfolio` or `/dashboard`.
3.  **Verify:**
    *   The "Plan Limit Exceeded" banner is **NOT** visible.
