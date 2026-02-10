import json
import time
from playwright.sync_api import sync_playwright

def verify_bottom_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use iPhone 13 viewport to ensure mobile layout
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        # Inject fake session
        project_id = "dyadqaccvdsislghpolv"
        fake_token = {
            "access_token": "fake-access-token",
            "refresh_token": "fake-refresh-token",
            "expires_in": 3600,
            "expires_at": int(time.time()) + 3600,
            "user": {
                "id": "fake-user-id",
                "email": "test@example.com"
            }
        }

        # We need to set localStorage before navigation or immediately after
        # But localStorage is cleared on navigation if not persistent? No, it persists for the origin.
        # So we can navigate to a blank page on the same origin, set it, then go to the app.

        try:
            # Navigate to the app (might redirect to login if auth check happens early)
            # We can try to set storage first by navigating to 404 page on same origin
            page.goto("http://localhost:3000/404")

            page.evaluate(f"""
                localStorage.setItem('sb-{project_id}-auth-token', '{json.dumps(fake_token)}');
            """)

            # Now navigate to dashboard
            page.goto("http://localhost:3000/")

            # Wait for content to load
            # Wait for BottomTabs to be visible
            # The BottomTabs has a specific structure. We can look for "Dashboard" text in the tabs.

            # Wait a bit for everything to settle
            page.wait_for_timeout(5000)

            # Take screenshot of the bottom part specifically or the whole page
            page.screenshot(path="verification/bottom_tabs.png")
            print("Screenshot saved to verification/bottom_tabs.png")

        except Exception as e:
            print(f"Error: {e}")
            # Take screenshot anyway if possible
            try:
                page.screenshot(path="verification/error_state.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_bottom_tabs()
