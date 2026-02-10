import os
import json
import time
from playwright.sync_api import sync_playwright, expect
from supabase import create_client

def load_env():
    env_vars = {}
    # Prioritize .env over .env.local if needed, or vice versa.
    # Usually .env.local overrides .env.
    files = ['.env', '.env.local']
    for env_file in files:
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        value = value.strip()
                        if (value.startswith('"') and value.endswith('"')) or \
                           (value.startswith("'") and value.endswith("'")):
                            value = value[1:-1]
                        env_vars[key] = value
    return env_vars

env = load_env()
SUPABASE_URL = env.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Env vars missing")
    exit(1)

try:
    project_ref = SUPABASE_URL.split('://')[1].split('.')[0]
except:
    project_ref = "127.0.0.1"

LOCAL_STORAGE_KEY = f"sb-{project_ref}-auth-token"

def verify():
    print("Starting verification...")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    email = f"test-{int(time.time())}@vexel.com"
    password = "Password123!"

    print(f"Signing up {email}...")
    try:
        res = supabase.auth.sign_up({"email": email, "password": password})
    except Exception as e:
        print(f"Sign up failed: {e}")
        return

    session = res.session
    if not session:
        try:
             res = supabase.auth.sign_in_with_password({"email": email, "password": password})
             session = res.session
        except Exception as e:
             print(f"Sign in failed: {e}")
             return

    if not session:
        print("No session obtained.")
        return

    print("Session obtained. Launching browser...")

    auth_token_value = {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": session.expires_at,
        "expires_in": session.expires_in,
        "token_type": session.token_type,
        "user": {
            "id": session.user.id,
            "aud": session.user.aud,
            "role": session.user.role,
            "email": session.user.email,
            "email_confirmed_at": session.user.email_confirmed_at,
            "phone": session.user.phone,
            "confirmation_sent_at": session.user.confirmation_sent_at,
            "confirmed_at": session.user.confirmed_at,
            "last_sign_in_at": session.user.last_sign_in_at,
            "app_metadata": session.user.app_metadata,
            "user_metadata": session.user.user_metadata,
            "created_at": session.user.created_at,
            "updated_at": session.user.updated_at
        }
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Go to root to set localStorage
        page.goto("http://localhost:3000")

        # 2. Inject session
        page.evaluate(f"""
            localStorage.setItem('{LOCAL_STORAGE_KEY}', JSON.stringify({json.dumps(auth_token_value)}));
        """)

        # 3. Reload/Navigate
        page.goto("http://localhost:3000/settings/automation")

        # 4. Verify content
        try:
            expect(page.get_by_text("Automation Rules")).to_be_visible(timeout=15000)
            print("Automation Rules page loaded.")
        except Exception:
            print("Timeout waiting for Automation Rules header.")
            page.screenshot(path="verification_timeout.png")
            browser.close()
            return

        page.screenshot(path="verification_settings.png")
        print("Screenshot taken: verification_settings.png")

        browser.close()

if __name__ == "__main__":
    verify()
