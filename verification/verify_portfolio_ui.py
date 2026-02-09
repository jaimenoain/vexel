from playwright.sync_api import sync_playwright
import time
import json

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Define mock data
    mock_entities = [
        {
            "id": "entity-1",
            "name": "Family Office",
            "type": "FAMILY",
            "assets": [
                {
                    "id": "asset-1",
                    "name": "Chase Checking",
                    "type": "BANK",
                    "currency": "USD",
                    "net_worth": 1000
                },
                {
                    "id": "asset-2",
                    "name": "Investment Account",
                    "type": "BANK",
                    "currency": "USD",
                    "net_worth": 50000
                }
            ]
        },
        {
            "id": "entity-2",
            "name": "Real Estate Holding",
            "type": "HOLDING",
            "assets": []
        }
    ]

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

    # Mock API response for Directory
    def handle_directory(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_entities)
        )

    # Mock Supabase Auth User endpoint (GET)
    def handle_auth_user(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_user)
        )

    # Mock Supabase Auth Session (if needed, but usually handled by client)
    # But let's route all auth requests

    # Intercept fetch to /api/directory
    page.route("**/api/directory", handle_directory)

    # Intercept Supabase Auth
    # The URL pattern might need to be specific to avoid intercepting other things
    page.route("**/auth/v1/user", handle_auth_user)

    # Inject dummy auth token into localStorage
    # Key: sb-<project-ref>-auth-token
    project_ref = "dyadqaccvdsislghpolv"
    page.add_init_script(f"""
        localStorage.setItem('sb-{project_ref}-auth-token', '{json.dumps(mock_session)}');
    """)

    # Navigate to Portfolio Page
    print("Navigating to http://localhost:3000/portfolio")
    page.goto("http://localhost:3000/portfolio")

    # Wait for the page to load (e.g., entity name)
    try:
        page.wait_for_selector("text=Family Office", timeout=10000)
        print("Entity 'Family Office' found.")
    except Exception as e:
        print(f"Failed to find entity: {e}")
        # page.screenshot(path="verification/failed_load_2.png")
        browser.close()
        return

    # Click to expand "Family Office"
    print("Clicking 'Family Office' to expand...")
    page.click("text=Family Office")

    # Wait a bit for animation
    page.wait_for_timeout(500)

    # Verify assets are visible
    if page.is_visible("text=Chase Checking"):
        print("Asset 'Chase Checking' is visible.")
    else:
        print("Asset 'Chase Checking' is NOT visible.")

    # Click "Real Estate Holding" (Empty)
    print("Clicking 'Real Estate Holding' (Empty)...")
    page.click("text=Real Estate Holding")
    page.wait_for_timeout(500)

    # Verify "No assets" text
    if page.is_visible("text=No assets"):
        print("'No assets' text is visible.")
    else:
        print("'No assets' text is NOT visible.")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
