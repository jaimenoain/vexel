import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Signup...")
        page.goto("http://localhost:3000/signup")

        # Generate unique email
        email = f"testuser_{int(time.time())}@example.com"
        password = "password123"

        # Fill signup form
        try:
            page.fill("input[type='email']", email)
            page.fill("input[type='password']", password)
            page.click("button:has-text('SIGN UP')")
            print(f"Signed up as {email}")
        except Exception as e:
            print(f"Signup form interaction failed: {e}")
            page.screenshot(path="verification/signup_error.png")
            return

        # Wait for redirect or dashboard
        # Assuming dev environment allows immediate login or redirects.
        try:
            # Wait for URL to change away from signup
            page.wait_for_url(lambda url: "/signup" not in url, timeout=10000)
            print(f"Redirected to {page.url}")
        except:
            print("Did not redirect after signup. Check screenshot.")
            page.screenshot(path="verification/signup_result.png")

        # Navigate to Portfolio manually if not redirected there
        if "/portfolio" not in page.url:
            page.goto("http://localhost:3000/portfolio")

        # Check if we are on login page (redirected)
        if "/login" in page.url:
            print("Redirected to login page. Signup/Login failed.")
            return

        # 2. Test A: Create Asset
        print("Testing Asset Creation...")
        try:
            page.wait_for_selector("button:has-text('Add Entity')", timeout=10000)
            page.click("button:has-text('Add Entity')")
        except:
             print("Add Entity button not found.")
             page.screenshot(path="verification/portfolio_page.png")
             return

        # Fill Form
        page.fill("input[name='name']", "Chase Checking")
        page.select_option("select[name='type']", "BANK")
        page.fill("input[name='currency']", "USD")

        # Submit
        page.click("button[type='submit']:has-text('Create Asset')")

        # Verify
        # Wait for "Chase Checking" to appear
        try:
            # It might appear in an accordion or list
            page.wait_for_selector("text=Chase Checking", timeout=10000)
            print("SUCCESS: Asset 'Chase Checking' created and visible.")
        except:
            print("FAILURE: Asset 'Chase Checking' not found after creation.")
            page.screenshot(path="verification/asset_creation_failed.png")

        # 3. Test B: Validation
        print("Testing Validation...")
        # Re-open modal
        page.click("button:has-text('Add Entity')")

        # Clear name if pre-filled (it shouldn't be as I reset form)
        page.fill("input[name='name']", "")

        # Submit empty
        page.click("button[type='submit']:has-text('Create Asset')")

        # Check for error "Name is required"
        try:
            page.wait_for_selector("text=Name is required", timeout=5000)
            print("SUCCESS: Validation error 'Name is required' verified.")
        except:
            print("FAILURE: Validation message not found.")
            page.screenshot(path="verification/validation_failed.png")

        # Close modal
        page.click("button[aria-label='Close']") # Or text=Cancel

        browser.close()

if __name__ == "__main__":
    run()
