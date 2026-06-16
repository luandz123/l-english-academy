import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/de-thi-thuc-te-nua-dau-nam-2026-de-so-01-6688890497269760"

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
        
        # Click button 97
        btn = page.locator("button[id^='question-'] >> text=/^\\s*97\\s*$/").first
        if btn.count() > 0:
            btn.click()
            time.sleep(2)
            
            # Print page style contents or CSS rules related to correct choices
            # Let's find classes containing correct, is-correct, success, etc. or see if we can get style sheets
            styles = page.locator("style").all()
            print(f"Total style tags: {len(styles)}")
            for idx, s in enumerate(styles):
                txt = s.inner_html()
                if "correct" in txt or "choice" in txt or "success" in txt:
                    print(f"Style {idx}:")
                    print(txt[:500])
                    print("...")
                    
            # Let's also search for linked CSS stylesheets
            links = page.locator("link[rel='stylesheet']").all()
            print(f"Total stylesheet links: {len(links)}")
            for idx, l in enumerate(links):
                print(f"Link {idx}: href='{l.get_attribute('href')}'")
        else:
            print("Button 97 not found")
    else:
        print("Review button not found")
        
    context.close()
