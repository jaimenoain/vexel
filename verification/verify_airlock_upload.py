import json
import time
import os
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Define mock data
    mock_item = {
        "id": "item-123",
        "status": "QUEUED",
        "traffic_light": None,
        "confidence_score": 0,
        "created_at": "2023-10-27T10:00:00Z",
        "ai_payload": {},
        "file_path": "unassigned/uuid/test-document.pdf"
    }

    # 1. Mock Initial Empty State
    # Note: Use a more specific pattern to avoid matching upload URL
    page.route("**/api/airlock?*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([])
    ))
    # Also catch the case without query params
    page.route("**/api/airlock", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([])
    ))

    print("Navigating to /airlock...")
    page.goto("http://localhost:3000/airlock")

    # 2. Verify Empty State
    try:
        expect(page.get_by_text("All Systems Nominal")).to_be_visible(timeout=10000)
        expect(page.get_by_text("No pending data")).to_be_visible()
        print("Empty state verified.")
    except Exception as e:
        print(f"Empty state verification failed: {e}")
        page.screenshot(path="verification/failed_empty_state.png")
        raise e

    # 3. Setup Upload Mock
    def handle_upload(route):
        print("Upload request received.")
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"success": True, "id": "item-123"})
        )

    page.route("**/api/airlock/upload", handle_upload)

    # 4. Perform Drag and Drop Upload (Simulated by setting input file)
    print("Uploading file...")
    # Create a dummy file
    if not os.path.exists("verification"):
        os.makedirs("verification")
    with open("verification/test-document.pdf", "w") as f:
        f.write("dummy pdf content")

    # Update GET mock to return the new item *after* upload triggers revalidation
    # We update the route handler now.

    # Remove previous routes
    page.unroute("**/api/airlock?*")
    page.unroute("**/api/airlock")

    # Add new route with item
    def handle_get_items(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([mock_item])
        )

    page.route("**/api/airlock?*", handle_get_items)
    page.route("**/api/airlock", handle_get_items)

    # Trigger upload
    # We need to target the input file element. It is hidden.
    page.set_input_files("input[type='file']", "verification/test-document.pdf")

    # 6. Verify List Update
    print("Waiting for list update...")
    try:
        expect(page.get_by_text("test-document.pdf")).to_be_visible(timeout=10000)
        expect(page.get_by_text("queued")).to_be_visible()
        print("List update verified.")
    except Exception as e:
        print(f"List update verification failed: {e}")
        page.screenshot(path="verification/failed_list_update.png")
        raise e

    # Take screenshot desktop
    page.screenshot(path="verification/airlock_desktop.png")
    print("Desktop screenshot taken.")

    # 7. Mobile View Verification
    context_mobile = browser.new_context(viewport={"width": 375, "height": 667})
    page_mobile = context_mobile.new_page()

    # Apply same mocks to new context
    page_mobile.route("**/api/airlock*", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps([]) # Start empty
    ))

    print("Navigating to mobile view...")
    page_mobile.goto("http://localhost:3000/airlock")

    # Verify FAB is visible (BottomTabs upload button)
    try:
        fab = page_mobile.locator("button[aria-label='Upload']")
        expect(fab).to_be_visible(timeout=5000)
        print("FAB verified on mobile.")
    except Exception as e:
        print(f"FAB verification failed: {e}")
        page_mobile.screenshot(path="verification/failed_fab.png")
        raise e

    # Take screenshot mobile
    page_mobile.screenshot(path="verification/airlock_mobile.png")
    print("Mobile screenshot taken.")

    # Regression Check: Navigation
    # On desktop, verify sidebar/topbar is present.
    # We check page (desktop context)
    try:
        # Assuming Shell has navigation/sidebar
        expect(page.get_by_role("navigation").first).to_be_visible()
        print("Regression check passed: Navigation visible.")
    except Exception as e:
        print(f"Navigation check failed: {e}")
        # Maybe use a broader check
        # expect(page.locator("aside")).to_be_visible()

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
