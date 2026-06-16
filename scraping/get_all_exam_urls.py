#!/usr/bin/env python3
import os
import sys
import json
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")

def main():
    with sync_playwright() as p:
        print(f"Launching chromium using profile: {USER_DATA_DIR}")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        
        start_url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2026-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6615179587485696"
        print(f"Navigating to: {start_url}")
        page.goto(start_url)
        print("Waiting for page load...")
        time.sleep(6)
        
        print(f"Final URL: {page.url}")
        print(f"Page Title: {page.title()}")
        
        # Take a screenshot to visualize
        page.screenshot(path=os.path.join(SCRIPT_DIR, "page_state.png"))
        print(f"Screenshot saved to: {os.path.join(SCRIPT_DIR, 'page_state.png')}")
        
        # Let's save all hyperlinks
        links = page.eval_on_selector_all("a", "elements => elements.map(el => ({href: el.href, text: el.innerText}))")
        print(f"Total links found: {len(links)}")
        
        context.close()

if __name__ == "__main__":
    main()
