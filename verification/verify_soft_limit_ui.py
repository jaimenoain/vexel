from playwright.sync_api import sync_playwright
import time
import json
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Define mock data for usage (Over Limit)
    mock_usage_over = {
        "current_count": 6,
        "limit": 5,
        "is_over_limit": True
    }

    mock_user = {
        "id": "fake-user-id",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "test@example.com",
        "phone": "",
        "app_metadata": {
            "provider": "email",
            "providers": ["email"]
        },
        "user_metadata": {},
        "created_at": "2023-01-01T00:00:00Z"
    }

    mock_session = {
        "access_token": "fake-token",
        "refresh_token": "fake-refresh-token",
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": mock_user
    }

    # Mock API response for Usage
    def handle_usage(route):
        # Default to over limit for this test
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_usage_over)
        )

    # Mock Supabase Auth User endpoint (GET)
    def handle_auth_user(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_user)
        )

    # Mock Directory (empty is fine, we just need the shell)
    def handle_directory(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([])
        )

    # Intercept fetch to /api/usage
    page.route("**/api/usage", handle_usage)

    # Intercept fetch to /api/directory (to prevent errors)
    page.route("**/api/directory", handle_directory)

    # Intercept Supabase Auth
    page.route("**/auth/v1/user", handle_auth_user)

    # Inject dummy auth token into localStorage
    # Key: sb-<project-ref>-auth-token
    # Use environment variable or default
    project_ref = os.environ.get("NEXT_PUBLIC_SUPABASE_PROJECT_REF", "dyadqaccvdsislghpolv")
    page.add_init_script(f"""
        localStorage.setItem('sb-{project_ref}-auth-token', '{json.dumps(mock_session)}');
    """)

    # Navigate to Portfolio Page
    print("Navigating to http://localhost:3000/portfolio")
    try:
        page.goto("http://localhost:3000/portfolio")
    except Exception as e:
        print(f"Navigation failed (is server running?): {e}")
        browser.close()
        return

    # Wait for page load
    try:
        # Wait for something that indicates page loaded (e.g. sidebar or empty state)
        page.wait_for_selector("nav", timeout=10000)
    except Exception as e:
        print(f"Page load timeout or navigation error: {e}")

    # Check for Banner
    print("Checking for Plan Limit Banner...")
    # Looking for "Plan Limit Exceeded" text
    try:
        banner = page.wait_for_selector("text=Plan Limit Exceeded", timeout=5000)
        if banner:
            print("SUCCESS: Plan Limit Banner is visible.")

            # Check for Upgrade button
            upgrade_btn = page.query_selector("text=Upgrade")
            if upgrade_btn:
                print("SUCCESS: Upgrade button found.")
            else:
                print("FAILURE: Upgrade button NOT found.")

            # Check text content details
            content = page.content()
            if "6 of 5 free assets" in content:
                 print("SUCCESS: Correct usage count displayed (6 of 5).")
            else:
                 print("FAILURE: Usage count text mismatch.")

        else:
            print("FAILURE: Plan Limit Banner NOT visible.")
    except Exception as e:
        print(f"FAILURE: Banner not found or timeout. {e}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
