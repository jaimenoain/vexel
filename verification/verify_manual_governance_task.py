import os
import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on("console", lambda msg: print(f"BROWSER LOG: {msg.text}"))

        # Intercept Assets request
        page.route("**/rest/v1/assets*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": "asset-1", "name": "Test Asset"}]'
        ))

        # Intercept Governance Tasks GET (initially empty)
        # We need to match the exact request pattern if possible, or broad match.
        # The component fetches with select('*, asset:assets(name)').eq('status', 'OPEN')
        # This translates to query params like select=*,asset:assets(name)&status=eq.OPEN

        def handle_get_tasks(route):
            print(f"Intercepted GET tasks: {route.request.url}")
            # Check if it's the initial empty state or subsequent
            # For simplicity, we can use a global counter or just always return empty first?
            # But the script updates the route handler later.
            route.fulfill(
                status=200,
                content_type="application/json",
                body='[]'
            )

        page.route("**/rest/v1/governance_tasks*select*", handle_get_tasks)

        # Intercept Governance Tasks POST (Create Task)
        def handle_post(route):
            print("Intercepted POST to governance_tasks")
            # Return success with created task
            route.fulfill(
                status=201,
                content_type="application/json",
                body='[{"id": "task-1", "title": "Review Q3 Performance", "description": "Test Desc", "status": "OPEN", "priority": "MEDIUM", "created_at": "2023-01-01T00:00:00Z", "due_date": "2023-12-31T00:00:00Z", "asset_id": "asset-1"}]'
            )

        page.route("**/rest/v1/governance_tasks", lambda route:
            handle_post(route) if route.request.method == "POST" else route.continue_()
        )

        # Mock Auth User
        page.route("**/auth/v1/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"id": "user-1", "aud": "authenticated", "role": "authenticated", "email": "test@example.com", "app_metadata": {"provider": "email"}, "user_metadata": {}, "identities": [], "created_at": "2023-01-01T00:00:00Z", "updated_at": "2023-01-01T00:00:00Z"}'
        ))

        page.route("**/auth/v1/token?grant_type=refresh_token", lambda route: route.fulfill(
             status=200,
             content_type="application/json",
             body='{"access_token": "mock-token", "token_type": "bearer", "expires_in": 3600, "refresh_token": "mock-refresh", "user": {"id": "user-1", "aud": "authenticated", "role": "authenticated", "email": "test@example.com"}}'
        ))

        # Inject Session
        project_ref = "dyadqaccvdsislghpolv"
        try:
            if os.path.exists(".env"):
                with open(".env", "r") as f:
                    content = f.read()
                    match = re.search(r"NEXT_PUBLIC_SUPABASE_URL=https://([^.]+)\.supabase\.co", content)
                    if match:
                        project_ref = match.group(1)
        except:
            pass

        print(f"Using project ref: {project_ref}")
        token_key = f"sb-{project_ref}-auth-token"
        mock_session = '{"access_token":"mock-token","refresh_token":"mock-refresh","expires_at":9999999999,"user":{"id":"user-1","aud":"authenticated","role":"authenticated","email":"test@example.com"}}'

        page.add_init_script(f"""
            localStorage.setItem('{token_key}', '{mock_session}');
        """)

        # Also add cookie
        # Note: value must be string. mock_session is a JSON string.
        # But cookie values often need to be URI encoded?
        # Supabase SSR reads it raw or URI decoded.
        # Let's try raw first.
        # However, Playwright add_cookies takes a list of dicts.
        context.add_cookies([{
            "name": token_key,
            "value": mock_session,
            "domain": "localhost",
            "path": "/"
        }])
        # Also add a "fake" cookie just to see if it appears
        context.add_cookies([{
            "name": "test-cookie",
            "value": "hello",
            "domain": "localhost",
            "path": "/"
        }])

        print("Navigating to /governance...")
        page.goto("http://localhost:3000/governance")

        # Wait for "Add Task" button
        try:
            expect(page.get_by_role("button", name="Add Task")).to_be_visible(timeout=10000)
            print("Found Add Task button")
        except Exception as e:
            print("Failed to find Add Task button. Maybe redirected to login?")
            page.screenshot(path="verification/failed_login.png")
            raise e

        # Click Add Task
        page.get_by_role("button", name="Add Task").click()

        # Check Modal
        expect(page.get_by_text("Create New Task")).to_be_visible()
        print("Modal opened")

        # Fill Form
        page.get_by_placeholder("e.g., Review Q3 Performance").fill("Review Q3 Performance")
        page.get_by_placeholder("Add details about this task...").fill("Please review carefully.")

        # Select Asset (optional)
        # Use simple timeout to ensure select is populated
        page.wait_for_timeout(1000)
        # Select by value or label? The option value is asset.id ('asset-1')
        page.locator("select").first.select_option("asset-1")

        # Set Due Date
        # The input type=date requires YYYY-MM-DD
        # Locate by label text "Due Date"
        # Note: In the component, label is "Due Date" but input is associated implicitly or simply by layout?
        # The component structure:
        # <label>Due Date</label> <input type="date">
        # Playwright get_by_label might require explicit 'for' attribute or nesting.
        # The component code:
        # <div className="flex flex-col gap-1">
        #    <label className="text-sm font-medium text-zinc-700">Due Date</label>
        #    <input type="date" ... />
        # </div>
        # Nesting is not strictly wrapping label around input. So get_by_label might fail if no 'for'.
        # I'll use locator based on input type.
        page.locator('input[type="date"]').fill("2023-12-31")

        # Submit
        # Mock the list refresh after creation
        # We update the route handler to return the new task

        def handle_get_tasks_updated(route):
            print(f"Intercepted GET tasks (updated): {route.request.url}")
            route.fulfill(
                status=200,
                content_type="application/json",
                body='[{"id": "task-1", "title": "Review Q3 Performance", "description": "Please review carefully.", "status": "OPEN", "priority": "MEDIUM", "created_at": "2023-01-01T00:00:00Z", "due_date": "2023-12-31T00:00:00Z", "asset_id": "asset-1", "asset": {"name": "Test Asset"}}]'
            )

        # We need to unroute or override? Playwright processes routes in reverse order of addition?
        # Or we can just add a new route which takes precedence?
        # Yes, "If multiple routes match the same request, the one added last is used."

        page.route("**/rest/v1/governance_tasks*select*", handle_get_tasks_updated)

        print("Clicking Create Task...")
        page.get_by_role("button", name="Create Task").click()

        # Wait for modal to close and list to update
        # Modal close
        expect(page.get_by_text("Create New Task")).not_to_be_visible()

        # List update
        expect(page.get_by_text("Review Q3 Performance")).to_be_visible()
        print("Task appeared in list")

        # Take screenshot
        page.screenshot(path="verification/governance_task_created.png")
        print("Screenshot saved to verification/governance_task_created.png")

        browser.close()

if __name__ == "__main__":
    run()
