from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        path = os.path.abspath("verification/debug.html")
        page.goto(f"file://{path}")
        try:
            popup_btn = page.wait_for_selector("#extension-popup", timeout=5000)
            popup_btn.click()
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/verification.png")
            print("Visual verification screenshot taken.")
        except Exception as e:
            print(f"FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
