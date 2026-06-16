import os
import time
from playwright.sync_api import sync_playwright
import re

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080"

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = context.pages[0] if context.pages else context.new_page()
    page.goto(url)
    time.sleep(5)
    
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        btn_review.click()
        time.sleep(5)
        
        # Find Q59 button
        btn_59 = page.locator("button[id^='question-'] >> text=/^\\s*59\\s*$/").first
        if btn_59.count() > 0:
            btn_59.click()
            time.sleep(2)
            
            # Find containers
            js_code = """
            () => {
                const selectors = [".game-object-quiz-wrap", ".question-detail-container", ".quiz-item", ".game-object-container"];
                let elements = [];
                for (const sel of selectors) {
                    elements.push(...Array.from(document.querySelectorAll(sel)));
                }
                elements = Array.from(new Set(elements)).filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
                });
                return elements.filter(el1 => !elements.some(el2 => el1 !== el2 && el1.contains(el2))).map(el => el.innerText);
            }
            """
            texts = page.evaluate(js_code)
            print(f"Found {len(texts)} leaf containers:")
            for idx, text in enumerate(texts):
                print(f"\n--- CONTAINER {idx+1} ---")
                print(text)
                match1 = re.search(r'(?:question|câu)\s*(\d+)', text, re.IGNORECASE)
                match2 = re.search(r'(?:^|\n)\s*(\d+)\s*\.', text)
                print(f"Match 1: {match1.group(1) if match1 else None}")
                print(f"Match 2: {match2.group(1) if match2 else None}")
        else:
            print("Q59 button not found!")
    else:
        print("Review button not found!")
    context.close()
