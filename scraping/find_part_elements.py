import os
import time
import re
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080"

with sync_playwright() as p:
    print("Launching chromium...")
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = context.pages[0] if context.pages else context.new_page()
    
    print("Navigating...")
    page.goto(url)
    time.sleep(5)
    
    # Enter review view
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        print("Clicking Xem lai bai lam...")
        btn_review.click()
        time.sleep(8)
        
    # Search all occurrences of "Part" (case-insensitive) on the page
    body_text = page.locator("body").inner_text()
    print("\n--- All occurrences of 'Part' in body text: ---")
    for line in body_text.split("\n"):
        if "part" in line.lower():
            print("LINE:", line)
            
    # Let's inspect the DOM elements that contain the word "Part"
    print("\n--- DOM elements containing 'Part': ---")
    elements = page.locator("text=/Part\\s*\\d+/i").all()
    for el in elements:
        try:
            if el.is_visible():
                print(f"Tag: {el.evaluate('el => el.tagName')}, Class: {el.evaluate('el => el.className')}, Text: {el.inner_text()}")
        except Exception:
            pass
            
    context.close()
