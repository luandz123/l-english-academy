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
            
            # Print answer container evaluation
            containers = page.locator(".game-object-quiz-wrap").all()
            for idx, c in enumerate(containers):
                if c.is_visible() and ("97." in c.inner_text() or "discount" in c.inner_text()):
                    print(f"Container text of Q97:\n{c.inner_text()}")
                    # Let's inspect choice elements inside it
                    choices = c.locator(".quiz-choice-item").all()
                    for c_idx, choice in enumerate(choices):
                        cls = choice.get_attribute("class") or ""
                        style = choice.locator("svg").evaluate_all("els => els.map(el => window.getComputedStyle(el).stroke || window.getComputedStyle(el).fill)")
                        print(f"Choice {c_idx}: class='{cls}', inner_text='{choice.inner_text().strip()}'")
                        print(f"  SVGs evaluation (stroke/fill): {style}")
                        
                        # Check child classes
                        childs = choice.locator("*").all()
                        for ch in childs:
                            ch_cls = ch.get_attribute("class") or ""
                            if ch_cls:
                                print(f"    Child tag={ch.evaluate('el => el.tagName')}, class='{ch_cls}'")
        else:
            print("Button 97 not found")
    else:
        print("Review button not found")
        
    context.close()
