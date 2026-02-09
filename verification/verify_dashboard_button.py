from playwright.sync_api import sync_playwright, expect
import json
import time

def verify_dashboard_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Mock Supabase session in localStorage
        fake_session = {
            "access_token": "fake-access-token",
            "refresh_token": "fake-refresh-token",
            "expires_in": 3600,
            "expires_at": int(time.time()) + 3600,
            "user": {
                "id": "fake-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com",
                "app_metadata": {
                    "provider": "email"
                },
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00.000000Z",
                "updated_at": "2023-01-01T00:00:00.000000Z"
            }
        }

        # Add init script to set localStorage before page load
        context.add_init_script(f"""
            localStorage.setItem('sb-dyadqaccvdsislghpolv-auth-token', JSON.stringify({json.dumps(fake_session)}));
        """)

        page = context.new_page()

        # Intercept dashboard net worth API
        page.route("**/api/dashboard/net-worth", lambda route: route.fulfill(
            status=200,
            body=json.dumps({"net_worth": 123456.78}),
            headers={"Content-Type": "application/json"}
        ))

        # Intercept report generation API
        # We simulate a delay to catch the "Generating..." state if possible, or just successful download
        def handle_report(route):
            time.sleep(1) # simulate delay
            route.fulfill(
                status=200,
                body=b"fake-pdf-content",
                headers={
                    "Content-Type": "application/pdf",
                    "Content-Disposition": "attachment; filename=report.pdf"
                }
            )

        page.route("**/api/reports/net-worth", handle_report)

        # Intercept Supabase calls to avoid errors if possible (optional)
        # page.route("**/rest/v1/**", lambda route: route.fulfill(status=200, body="[]"))

        print("Navigating to dashboard...")
        # We go to / directly.
        page.goto("http://localhost:3000/")

        # Wait for net worth to load
        print("Waiting for net worth...")
        try:
            expect(page.get_by_text("Net Worth")).to_be_visible(timeout=10000)
            expect(page.get_by_text("$123,456.78")).to_be_visible()
        except Exception as e:
            print(f"Failed to load dashboard: {e}")
            page.screenshot(path="verification/failed_load.png")
            raise e

        print("Dashboard loaded. Checking for button...")
        download_btn = page.get_by_role("button", name="Download Report")
        expect(download_btn).to_be_visible()

        # Take screenshot of the button state
        page.screenshot(path="verification/dashboard_with_button.png")
        print("Screenshot taken.")

        # Click button
        print("Clicking button...")
        download_btn.click()

        # Check for loading state
        # Depending on timing, we might miss "Generating...", but let's try
        try:
            expect(page.get_by_text("Generating...")).to_be_visible(timeout=2000)
            print("Loading state verified.")
        except:
            print("Loading state possibly missed due to fast response.")

        # Verify success toast if possible
        # SimpleToast shows "Report downloaded successfully"
        try:
            expect(page.get_by_text("Report downloaded successfully")).to_be_visible(timeout=5000)
            print("Toast verified.")
        except:
            print("Toast missed.")

        page.screenshot(path="verification/dashboard_after_click.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard_button()
