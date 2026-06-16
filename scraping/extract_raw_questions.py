import os
import time
import re
import json
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
    
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        btn_review.click()
        time.sleep(5)
        
        # Get all buttons
        buttons = page.locator("button[id^='question-']").all()
        q_nums = []
        for btn in buttons:
            txt = btn.inner_text().strip()
            if txt.isdigit():
                q_nums.append(int(txt))
        q_nums.sort()
        print(f"Palette buttons count: {len(q_nums)}")
        
        results = []
        # Group similar clicks
        for q_num in q_nums:
            btn = page.locator(f"button[id^='question-'] >> text=/^\\s*{q_num}\\s*$/").first
            if btn.count() > 0 and btn.is_visible():
                btn.click()
                time.sleep(0.5) # Fast wait
                
                # Get all visible container texts
                containers = page.locator(".game-object-quiz-wrap, .question-detail-container, .quiz-item, .game-object-container").all()
                visible = []
                for c in containers:
                    if c.is_visible():
                        txt = c.inner_text().strip()
                        first_line = txt.split('\n')[0] if txt else 'EMPTY'
                        visible.append(first_line)
                
                results.append({
                    "button": q_num,
                    "visible_questions": visible
                })
                print(f"Button {q_num} shows: {visible}")
        
        with open(os.path.join(SCRIPT_DIR, "palette_mapping.json"), "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print("Done mapping.")
    else:
        print("Review button not found")
        
    context.close()
