#!/usr/bin/env python3
import os
import time
from playwright.sync_api import sync_playwright

USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".playwright_user_data")

def main():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            viewport=None,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        if page.url == "about:blank":
            page.goto("https://ngoaingu24h.vn")
            
        print("Monitoring browser... Please login and open the exam review page.")
        try:
            for _ in range(30): # Monitor for 60 seconds
                print(f"Current URL: {page.url} | Title: {page.title()}")
                time.sleep(2)
        except KeyboardInterrupt:
            pass
        context.close()

if __name__ == "__main__":
    main()
