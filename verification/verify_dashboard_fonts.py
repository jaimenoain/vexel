import json
import re
from playwright.sync_api import sync_playwright, expect

def verify_dashboard_fonts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Increase viewport to ensure we see the desktop layout with the 3 columns
        context = browser.new_context(viewport={"width": 1280, "height": 720})

        # Mock Supabase session
        project_id = "dyadqaccvdsislghpolv"
        fake_session = {
            "access_token": "fake-jwt-token",
            "refresh_token": "fake-refresh-token",
            "expires_in": 3600,
            "expires_at": 9999999999,
            "user": {
                "id": "test-user-id",
                "aud": "authenticated",
                "role": "authenticated",
                "email": "test@example.com",
                "app_metadata": {"provider": "email"},
                "user_metadata": {},
                "created_at": "2023-01-01T00:00:00.000000Z",
                "updated_at": "2023-01-01T00:00:00.000000Z"
            }
        }

        # Inject session into localStorage
        context.add_init_script(f"""
            window.localStorage.setItem('sb-{project_id}-auth-token', JSON.stringify({json.dumps(fake_session)}));
        """)

        page = context.new_page()

        # Mock API routes
        # 1. Net Worth
        page.route("**/api/dashboard/net-worth", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"net_worth": 1234567.89})
        ))

        # 2. Pending Actions (Airlock)
        page.route("**/api/airlock", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([
                {"status": "REVIEW_NEEDED", "traffic_light": "RED"},
                {"status": "REVIEW_NEEDED", "traffic_light": "YELLOW"},
                {"status": "QUEUED", "traffic_light": "GREEN"}
            ])
        ))

        # 3. Governance Alerts
        page.route("**/api/dashboard/governance-alerts", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([
                {"id": "1", "title": "Alert 1", "description": "Desc 1", "priority": "CRITICAL", "created_at": "2023-01-01"},
                {"id": "2", "title": "Alert 2", "description": "Desc 2", "priority": "HIGH", "created_at": "2023-01-01"}
            ])
        ))

        print("Navigating to dashboard...")
        page.goto("http://localhost:3000")

        # Wait for content to load
        print("Waiting for content...")
        try:
            # Wait for any of the content to appear to ensure loading is done
            expect(page.get_by_text("1,234,567.89")).to_be_visible(timeout=10000)
        except Exception as e:
            print(f"Failed to load dashboard content: {e}")
            page.screenshot(path="verification/failed_load_fonts.png")
            raise e

        # Verify Net Worth Font
        print("Verifying Net Worth Font...")
        # The container has text-4xl and font-mono
        net_worth_container = page.locator("div.text-4xl", has_text="1,234,567.89")
        expect(net_worth_container).to_have_class(re.compile(r"font-mono"))

        # Verify Pending Actions Font
        print("Verifying Pending Actions Font...")
        # PendingActions has "Pending Actions" title. Count should be 2.
        pending_section = page.locator("div", has_text="Pending Actions").last
        # We look for the span with text-6xl inside this section
        pending_count_locator = pending_section.locator("span.text-6xl")
        expect(pending_count_locator).to_have_text("2")
        expect(pending_count_locator).to_have_class(re.compile(r"font-mono"))

        # Verify Governance Alerts Font
        print("Verifying Governance Alerts Font...")
        # Governance Alerts section. Count should be 2.
        governance_section = page.locator("div", has_text="Governance Alerts").last
        alert_count_locator = governance_section.locator("span.text-6xl")
        expect(alert_count_locator).to_have_text("2")
        expect(alert_count_locator).to_have_class(re.compile(r"font-mono"))

        # Screenshot
        page.screenshot(path="verification/dashboard_fonts.png")
        print("Screenshot saved to verification/dashboard_fonts.png")

        browser.close()

if __name__ == "__main__":
    verify_dashboard_fonts()
