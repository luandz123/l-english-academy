import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080"

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
    time.sleep(6)
    
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        print("Clicking 'Xem lại bài làm'...")
        btn_review.click()
        time.sleep(6)
        
        # Check if question buttons are present
        buttons = page.locator("button[id^='question-']").all()
        print(f"Number of question buttons found: {len(buttons)}")
        
        texts = []
        for btn in buttons:
            txt = btn.inner_text().strip()
            if txt:
                texts.append(int(txt))
        
        texts.sort()
        print("Scraped question numbers:", texts)
        
        missing = [i for i in range(1, 201) if i not in texts]
        print("Missing question numbers in DOM:", missing)
        
        page.screenshot(path=os.path.join(SCRIPT_DIR, "inspect_2022_de01_review.png"))
        print("Screenshot saved.")
    else:
        print("button 'Xem lại bài làm' not found or not visible!")
            
    context.close()
