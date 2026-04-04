import sys, os
from playwright.sync_api import sync_playwright

def test_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(script_dir, "debug.html")
        page.goto(f"file://{path}")

        try:
            # Trigger popup
            popup_btn = page.wait_for_selector("#extension-popup")
            popup_btn.click()

            # Wait for UI to show
            page.wait_for_selector("#ext-ui-popup", state="attached", timeout=5000)

            # Take screenshot
            page.screenshot(path="verification/verification.png")
            print("SUCCESS")
        except Exception as e:
            print(f"FAILED: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    test_ui()
