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
        
        url = "https://ngoaingu24h.vn/tat-ca-khoa-hoc"
        print(f"Navigating to course index: {url}")
        page.goto(url)
        print("Waiting for page load...")
        time.sleep(6)
        
        page.screenshot(path=os.path.join(SCRIPT_DIR, "catalog_page.png"))
        print(f"Screenshot saved to catalog_page.png")
        
        # Dump page HTML for analysis
        with open(os.path.join(SCRIPT_DIR, "catalog_page.html"), "w", encoding="utf-8") as f:
            f.write(page.content())
            
        # Let's extract all links on the catalog page
        links = page.eval_on_selector_all("a", "elements => elements.map(el => ({href: el.href, text: el.innerText}))")
        print(f"Total links found on catalog page: {len(links)}")
        
        course_links = [l for l in links if "/khoa-hoc/" in l.get("href", "")]
        print("\n--- Course Links Found ---")
        for cl in course_links:
            print(f"[{cl['text'].strip()}] -> {cl['href']}")
            
        context.close()

if __name__ == "__main__":
    main()
