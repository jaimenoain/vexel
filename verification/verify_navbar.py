from playwright.sync_api import sync_playwright
import time

def verify_navbar():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000/verify-landing...")
            # Navigate to the landing page with increased timeout
            response = page.goto("http://localhost:3000/verify-landing", timeout=60000)
            if not response.ok:
                print(f"Error loading page: {response.status} {response.status_text}")

            # Wait for content to load
            page.wait_for_load_state("networkidle")

            # Wait for the navbar to be visible
            print("Waiting for nav element...")
            page.wait_for_selector("nav", timeout=10000)

            # Check for "Vexel" brand
            vexel_text = page.get_by_text("Vexel")
            if vexel_text.is_visible():
                print("SUCCESS: Vexel brand is visible")
            else:
                print("FAILURE: Vexel brand is not visible")

            # Check for "Sign In" link
            sign_in_link = page.get_by_role("link", name="Sign In")
            if sign_in_link.is_visible():
                print("SUCCESS: Sign In link is visible")
                # Check href
                href = sign_in_link.get_attribute("href")
                if href == "/login":
                    print("SUCCESS: Sign In link points to /login")
                else:
                    print(f"FAILURE: Sign In link points to {href}")
            else:
                print("FAILURE: Sign In link is not visible")

            # Take screenshot
            page.screenshot(path="verification/navbar_screenshot.png")
            print("Screenshot saved to verification/navbar_screenshot.png")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Take screenshot anyway if possible
            try:
                page.screenshot(path="verification/error_screenshot.png")
                print("Error screenshot saved to verification/error_screenshot.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_navbar()
