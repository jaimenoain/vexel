from playwright.sync_api import sync_playwright
import json
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Mock Supabase Auth Sign In
    def handle_auth_token(route):
        print(f"Intercepted request: {route.request.url}")

        if "grant_type=password" in route.request.url:
            try:
                post_data = route.request.post_data_json
                email = post_data.get("email")
                password = post_data.get("password")

                if email == "user@example.com" and password == "wrongpassword":
                    route.fulfill(
                        status=400,
                        content_type="application/json",
                        body=json.dumps({"error": "invalid_grant", "error_description": "Invalid login credentials"})
                    )
                else:
                     route.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps({
                            "access_token": "fake-token",
                            "refresh_token": "fake-refresh-token",
                            "user": {"id": "fake-user-id", "email": email}
                        })
                    )
            except Exception as e:
                print(f"Error parsing request body: {e}")
                route.continue_()
        else:
             route.continue_()

    page.route("**/auth/v1/token**", handle_auth_token)

    # 1. Test Login Page UI
    print("Navigating to Login Page...")
    try:
        page.goto("http://localhost:3000/login")
    except Exception as e:
        print(f"Failed to load page: {e}")
        browser.close()
        return

    print("Checking Login Page Elements...")
    try:
        page.wait_for_selector("text=LOGIN", timeout=30000)
        page.wait_for_selector("input[type='email']", timeout=5000)
        page.wait_for_selector("input[type='password']", timeout=5000)
        page.wait_for_selector("button:has-text('SIGN IN')", timeout=5000)
        print("SUCCESS: Login Page UI looks correct.")

        # Take Screenshot of Login
        page.screenshot(path="verification/login.png")
        print("Screenshot saved to verification/login.png")

    except Exception as e:
        print(f"FAILURE: Login Page UI missing elements. {e}")
        browser.close()
        return

    # 2. Test Login Failure
    print("Testing Login Failure...")
    page.fill("input[type='email']", "user@example.com")
    page.fill("input[type='password']", "wrongpassword")
    page.click("button:has-text('SIGN IN')")

    try:
        page.wait_for_selector("text=Invalid login credentials", timeout=5000)
        print("SUCCESS: Error toast displayed correctly.")

        # Take Screenshot of Error
        page.screenshot(path="verification/login_error.png")
        print("Screenshot saved to verification/login_error.png")

    except Exception as e:
        print(f"FAILURE: Error toast not displayed. {e}")

    # 3. Test Navigation to Signup
    print("Testing Navigation to Signup...")
    page.click("text=Sign Up")

    try:
        page.wait_for_url("**/signup", timeout=5000)
        page.wait_for_selector("text=SIGN UP", timeout=5000)
        print("SUCCESS: Navigated to Signup Page.")
    except Exception as e:
        print(f"FAILURE: Navigation to Signup failed. {e}")
        browser.close()
        return

    # 4. Test Signup Page UI
    print("Checking Signup Page Elements...")
    try:
        page.wait_for_selector("input[type='email']", timeout=5000)
        page.wait_for_selector("input[type='password']", timeout=5000)
        page.wait_for_selector("button:has-text('SIGN UP')", timeout=5000)
        print("SUCCESS: Signup Page UI looks correct.")

        # Take Screenshot of Signup
        page.screenshot(path="verification/signup.png")
        print("Screenshot saved to verification/signup.png")

    except Exception as e:
        print(f"FAILURE: Signup Page UI missing elements. {e}")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
