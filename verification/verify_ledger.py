from playwright.sync_api import sync_playwright

def verify_ledger():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to http://localhost:3000/verify-ledger")
        try:
            page.goto("http://localhost:3000/verify-ledger", timeout=60000)
        except Exception as e:
            print(f"Navigation failed: {e}")
            browser.close()
            return

        print("Waiting for content...")
        try:
            page.wait_for_selector("text=The Horizon", timeout=10000)
            # Check for the group row
            page.wait_for_selector("text=Coffee (2 items)", timeout=10000)
        except Exception as e:
            print(f"Selectors not found: {e}")
            page.screenshot(path="verification/error_screenshot.png")
            browser.close()
            return

        print("Expanding group...")
        page.click("text=Coffee (2 items)")

        print("Waiting for expanded content...")
        try:
            page.wait_for_selector("text=Coffee Shop", timeout=5000)
        except Exception as e:
             print(f"Expanded content not found: {e}")

        print("Taking screenshot...")
        page.screenshot(path="verification/ledger_screenshot.png", full_page=True)
        print("Screenshot saved to verification/ledger_screenshot.png")

        browser.close()

if __name__ == "__main__":
    verify_ledger()
