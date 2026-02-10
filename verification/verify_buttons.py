from playwright.sync_api import sync_playwright, expect
import time
import os

def verify_pages():
    if not os.path.exists("verification"):
        os.makedirs("verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Define test cases: url -> expected button text
        test_cases = {
            "/portfolio": "Add Entity",
            "/documents": "Upload Document",
            "/ledger": "Add Transaction",
            "/governance": "Add Task",
            "/directory": "Add Contact"
        }

        try:
            for path, button_text in test_cases.items():
                print(f"Checking {path}...")
                page.goto(f"http://localhost:3000{path}")

                # Wait for hydration/rendering just in case
                page.wait_for_load_state("networkidle")

                # Check for button
                button = page.get_by_role("button", name=button_text)
                expect(button).to_be_visible()

                # Take screenshot
                screenshot_path = f"verification/verify_buttons_{path.strip('/')}.png"
                page.screenshot(path=screenshot_path)
                print(f"Verified {path} and saved screenshot to {screenshot_path}.")

        except Exception as e:
            print(f"Verification failed: {e}")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    verify_pages()
