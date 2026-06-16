import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6312161850687488"

with sync_playwright() as p:
    print(f"Launching chromium with profile: {USER_DATA_DIR}")
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = context.pages[0] if context.pages else context.new_page()
    
    print(f"Navigating to {url}")
    page.goto(url)
    time.sleep(5)
    page.screenshot(path=os.path.join(SCRIPT_DIR, "debug_de_01_landing.png"))
    print("Landing page screenshot saved.")
    
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        print("Clicking 'Xem lại bài làm'...")
        btn_review.click()
        time.sleep(5)
        page.screenshot(path=os.path.join(SCRIPT_DIR, "debug_de_01_review.png"))
        print("Review page screenshot saved.")
        
        # Dump HTML
        html = page.content()
        with open(os.path.join(SCRIPT_DIR, "debug_de_01_review.html"), "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML dumped.")
        
        # Check if question buttons are present
        buttons = page.locator("button[id^='question-']").all()
        print(f"Number of question buttons found: {len(buttons)}")
        if buttons:
            print(f"First button text: '{buttons[0].inner_text().strip()}'")
    else:
        print("button 'Xem lại bài làm' not found or not visible!")
        btn_start = page.locator("button >> text=/^\\s*(Làm bài|Tiếp tục)\\s*$/").first
        if btn_start.count() > 0:
            print(f"Found start button: '{btn_start.inner_text().strip()}'")
        else:
            print("No start/resume button found either.")
            
    context.close()
