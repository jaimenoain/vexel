from playwright.sync_api import sync_playwright
import time
import json
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Define mock data
    mock_net_worth = {
        "net_worth": 1234.56
    }

    mock_user = {
        "id": "fake-user-id",
        "aud": "authenticated",
        "role": "authenticated",
        "email": "test@example.com",
        "app_metadata": {},
        "user_metadata": {},
        "created_at": "2023-01-01T00:00:00Z"
    }

    project_ref = os.environ.get("NEXT_PUBLIC_SUPABASE_PROJECT_REF", "dyadqaccvdsislghpolv")

    mock_session = {
        "access_token": "fake-token",
        "refresh_token": "fake-refresh-token",
        "expires_at": int(time.time()) + 3600,
        "user": mock_user
    }

    def handle_net_worth(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_net_worth)
        )

    def handle_auth_user(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_user)
        )

    page.route("**/api/dashboard/net-worth", handle_net_worth)
    page.route("**/auth/v1/user", handle_auth_user)

    page.add_init_script(f"""
        localStorage.setItem('sb-{project_ref}-auth-token', JSON.stringify({json.dumps(mock_session)}));
    """)

    print("Navigating to http://localhost:3000/")
    try:
        page.goto("http://localhost:3000/")
    except Exception as e:
        print(f"Navigation failed: {e}")
        browser.close()
        return

    try:
        page.wait_for_selector("text=Dashboard", timeout=10000)
    except Exception as e:
        print(f"Page load timeout: {e}")
        page.screenshot(path="verification/failed_load.png")
        browser.close()
        return

    # Hide Next.js dev tools if present
    try:
        page.evaluate("""
            const tools = document.querySelector('nextjs-portal') || document.querySelector('#__next-build-watcher');
            if (tools) tools.style.display = 'none';
        """)
    except:
        pass

    # 1. Verify English (Default)
    print("Verifying English...")
    if page.is_visible("text=Dashboard"):
        print("SUCCESS: 'Dashboard' found.")
    else:
        print("FAILURE: 'Dashboard' NOT found.")

    # Check Net Worth Title (using heading role)
    if page.get_by_role("heading", name="Net Worth").is_visible():
        print("SUCCESS: 'Net Worth' title found.")
    else:
        # Fallback to text check
        if page.is_visible("text=NET WORTH") or page.is_visible("text=Net Worth"):
             print("SUCCESS: 'Net Worth' found (fallback).")
        else:
             print("FAILURE: 'Net Worth' title NOT found.")

    time.sleep(1)

    content = page.content()
    if "$1,234.56" in content:
        print("SUCCESS: '$1,234.56' found.")
    else:
        print("FAILURE: '$1,234.56' NOT found.")

    page.screenshot(path="verification/english_view.png")

    # 2. Switch to Spanish
    print("Switching to Spanish...")
    try:
        # Use exact match and force click
        es_btn = page.get_by_role("button", name="ES", exact=True)
        if es_btn.is_visible():
            es_btn.click(force=True)
            time.sleep(1)
        else:
            print("FAILURE: ES button not visible.")
    except Exception as e:
        print(f"Failed to click ES: {e}")

    if page.is_visible("text=Tablero"):
        print("SUCCESS: 'Tablero' found.")
    else:
        print("FAILURE: 'Tablero' NOT found.")

    if page.get_by_role("heading", name="Patrimonio Neto").is_visible():
        print("SUCCESS: 'Patrimonio Neto' found.")
    else:
        print("FAILURE: 'Patrimonio Neto' NOT found.")

    page.screenshot(path="verification/spanish_view.png")
    print("Screenshot saved to verification/spanish_view.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
