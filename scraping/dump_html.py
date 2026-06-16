#!/usr/bin/env python3
import os
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
HTML_FILE = os.path.join(SCRIPT_DIR, "page_source.html")

def main():
    print("=========================================================")
    print("💾 NGOAINGU24H HTML DUMPER")
    print("=========================================================")
    
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
            
        print("\n👉 INSTRUCTIONS:")
        print("1. Open the exam review page on the browser window.")
        print("2. Once the page is loaded, press [ENTER] here to dump its HTML source.")
        
        input("\nPress [ENTER] to dump HTML...")
        
        content = page.content()
        with open(HTML_FILE, "w", encoding="utf-8") as f:
            f.write(content)
            
        print(f"\n✅ HTML source dumped successfully to: {HTML_FILE}")
        context.close()

if __name__ == "__main__":
    main()
