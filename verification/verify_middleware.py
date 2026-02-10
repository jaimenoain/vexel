from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # 1. Test Dashboard Protection (Root /)
    print("Navigating to Dashboard (Root /)...")
    try:
        response = page.goto("http://localhost:3000/", timeout=10000)
        # Wait for redirect to complete. The timeout handles the wait.
        # If it doesn't redirect, wait_for_url will timeout.
        page.wait_for_url("**/login", timeout=5000)
        print("SUCCESS: Redirected to Login Page from Root.")
    except Exception as e:
        print(f"FAILURE: Did not redirect to Login from Root. Current URL: {page.url}")
        # print(e) # Optional: print full error if needed

    # 2. Test Portfolio Protection (/portfolio)
    print("Navigating to Portfolio (/portfolio)...")
    try:
        response = page.goto("http://localhost:3000/portfolio", timeout=10000)
        page.wait_for_url("**/login", timeout=5000)
        print("SUCCESS: Redirected to Login Page from Portfolio.")
    except Exception as e:
        print(f"FAILURE: Did not redirect to Login from Portfolio. Current URL: {page.url}")

    # 3. Test Login Page Access (/login)
    print("Navigating to Login Page (/login)...")
    try:
        response = page.goto("http://localhost:3000/login", timeout=10000)
        # Should stay on login. We wait a bit to ensure no late redirect happens.
        time.sleep(1)
        if "/login" in page.url:
             print("SUCCESS: Stayed on Login Page.")
        else:
             print(f"FAILURE: Unexpected redirect from Login. Current URL: {page.url}")
    except Exception as e:
        print(f"FAILURE: Error accessing Login Page. {e}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
