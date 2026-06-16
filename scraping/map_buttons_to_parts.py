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
        
    # Find all segment elements
    segments = page.locator(".question-segment-item").all()
    print(f"Found {len(segments)} segments.")
    
    button_to_part = {}
    for seg in segments:
        header_el = seg.locator(".question-segment-item-header").first
        if header_el.count() == 0:
            continue
        header_text = header_el.inner_text().strip()
        match = re.search(r'Part\s*(\d+)', header_text, re.IGNORECASE)
        if not match:
            continue
        part_num = int(match.group(1))
        
        buttons = seg.locator("button").all()
        btn_nums = []
        for btn in buttons:
            txt = btn.inner_text().strip()
            if txt.isdigit():
                btn_nums.append(int(txt))
                button_to_part[int(txt)] = part_num
                
        print(f"Segment '{header_text}' -> Part {part_num} contains buttons: {btn_nums}")
        
    print("\nTotal mapped buttons:", len(button_to_part))
    context.close()
