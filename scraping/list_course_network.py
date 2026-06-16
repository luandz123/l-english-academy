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
        print(f"Launching chromium...")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        
        # Listen to all API requests
        requests_log = []
        def handle_request(request):
            if "api" in request.url or "graphql" in request.url or "json" in request.url:
                requests_log.append({
                    "method": request.method,
                    "url": request.url,
                    "post_data": request.post_data
                })
        
        page.on("request", handle_request)
        
        url = "https://ngoaingu24h.vn/khoa-hoc/luyen-bo-de-toeic-new-format-sat-de-thi-that-2026-5314073728122880"
        print(f"Navigating to: {url}")
        page.goto(url)
        print("Waiting for page load and network requests...")
        time.sleep(10)
        
        print(f"\nCaptured {len(requests_log)} API/JSON requests:")
        for r in requests_log:
            print(f"[{r['method']}] {r['url']}")
            if r['post_data']:
                print(f"  Payload: {r['post_data'][:500]}")
                
        context.close()

if __name__ == "__main__":
    main()
