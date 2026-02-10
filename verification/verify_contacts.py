import time
from playwright.sync_api import sync_playwright

def verify_contacts():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("1. Verifying Directory UI (Mocked)...")
        page.goto("http://localhost:3000/directory")

        # Check title
        try:
            page.wait_for_selector("text=Directory", timeout=5000)
            print("Directory page loaded.")
        except:
            print("Directory page failed to load.")
            page.screenshot(path="verification/directory_failed.png")
            return

        # Check existing mock contacts
        try:
            page.wait_for_selector("text=Alice Smith")
            page.wait_for_selector("text=Bob Jones")
            print("Mock contacts visible.")
        except:
            print("Mock contacts not visible.")
            page.screenshot(path="verification/directory_list_failed.png")

        # Check Add Contact Modal
        print("Checking Add Contact Modal...")
        page.click("button:has-text('Add Contact')")
        try:
            page.wait_for_selector("text=Add New Contact")
            print("Modal opened.")
        except:
            print("Modal failed to open.")
            page.screenshot(path="verification/modal_failed.png")
            return

        # Fill and Submit
        page.fill("input[name='name']", "John Doe")
        page.fill("input[name='role']", "Tester")
        page.fill("input[name='email']", "john@test.com")
        page.click("button[type='submit']")

        # Verify new contact appears
        try:
            page.wait_for_selector("text=John Doe", timeout=5000)
            print("SUCCESS: New contact 'John Doe' added to list (Mock).")
        except:
            print("FAILURE: New contact not found.")
            page.screenshot(path="verification/add_contact_failed.png")

        print("2. Verifying Ledger Modal Dropdown (Mocked)...")
        page.goto("http://localhost:3000/ledger")

        try:
            page.click("button:has-text('Add Transaction')")
            page.wait_for_selector("text=Add Manual Transaction")

            # Check Dropdown
            # Label: Payee / Payer
            page.wait_for_selector("label:has-text('Payee / Payer')")

            # Check options (Alice Smith)
            content = page.content()
            if "Alice Smith" in content and "Bob Jones" in content:
                 print("SUCCESS: Ledger Modal has contacts in dropdown.")
            else:
                 print("FAILURE: Contacts not found in Ledger dropdown.")
                 page.screenshot(path="verification/ledger_dropdown_failed.png")

        except Exception as e:
            print(f"Ledger verification failed: {e}")
            page.screenshot(path="verification/ledger_failed.png")

        print("3. Verifying Airlock Transaction Editor (Mocked)...")
        # Airlock ID is mocked as 'mock-id' in page logic, but URL param can be anything
        page.goto("http://localhost:3000/airlock/123")

        try:
            page.wait_for_selector("text=Transaction Editor", timeout=10000)

            # Check Dropdown
            page.wait_for_selector("label:has-text('Payee / Payer')")

            # Check options
            content = page.content()
            if "Alice Smith" in content:
                 print("SUCCESS: Airlock Editor has contacts in dropdown.")
            else:
                 print("FAILURE: Contacts not found in Airlock dropdown.")
                 page.screenshot(path="verification/airlock_dropdown_failed.png")

            # Take a final screenshot for proof
            page.screenshot(path="verification/contacts_verification_success.png")

        except Exception as e:
             print(f"Airlock verification failed: {e}")
             page.screenshot(path="verification/airlock_failed.png")

        browser.close()

if __name__ == "__main__":
    verify_contacts()
