from playwright.sync_api import sync_playwright

def verify_styles():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000")
            page.goto("http://localhost:3000")

            # Wait for content
            page.wait_for_selector("body")

            # Get computed styles
            computed_styles = page.evaluate("""() => {
                const body = document.querySelector('body');
                const styles = window.getComputedStyle(body);
                return {
                    fontFamily: styles.fontFamily,
                    color: styles.color,
                    foregroundVar: getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()
                };
            }""")

            print(f"Computed Styles: {computed_styles}")

            # Verify color #111111 -> rgb(17, 17, 17)
            expected_color = "rgb(17, 17, 17)"
            if computed_styles['color'] == expected_color:
                print("SUCCESS: Body color matches #111111")
            else:
                print(f"FAILURE: Body color is {computed_styles['color']}, expected {expected_color}")

            # Verify font family
            # Computed font family string usually puts quotes around font names with spaces, but Inter is one word.
            # It might return the stack.
            # Since we used a variable, the computed style should reflect the resolved font stack.
            # "Inter" might be loaded as "Inter" or similar.
            # The stack we set: var(--font-inter), Helvetica, Arial, sans-serif
            # Computed style should start with Inter or similar if it loaded, or at least be the stack.

            if "Inter" in computed_styles['fontFamily'] or "inter" in computed_styles['fontFamily'].lower():
                 print("SUCCESS: Font family contains Inter")
            else:
                 print(f"WARNING: Font family is {computed_styles['fontFamily']}, expected Inter to be present.")

            # Verify CSS variable
            if computed_styles['foregroundVar'] == "#111111":
                print("SUCCESS: --foreground variable is #111111")
            else:
                print(f"FAILURE: --foreground variable is {computed_styles['foregroundVar']}, expected #111111")

            page.screenshot(path="verification_styles.png")
            print("Screenshot saved to verification_styles.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_styles()
