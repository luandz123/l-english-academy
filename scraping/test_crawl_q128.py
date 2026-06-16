import os
import time
import re
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080"

SELECTORS = {
    "questionButtons": "button[id^='question-']",
    "questionContainer": ".game-object-quiz-wrap, .question-detail-container, .quiz-item, .game-object-container",
    "questionText": ".game-object-question-extend-v2-text, .game-object-question-text, .quiz-question-title, .question-text",
    "answerItems": ".quiz-choice-item, .answer-item, .choice-item",
    "answerText": ".quiz-choice-item-content, .answer-text, .choice-text",
}

def get_question_button(page, num):
    selectors = [
        f"button[id^='question-'] >> text=/^\\s*{num}\\s*$/",
        f"button >> text=/^\\s*{num}\\s*$/",
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None

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
        
        for q_num in [127, 128, 129, 130, 131, 132, 133, 134, 135]:
            btn = get_question_button(page, q_num)
            if btn:
                print(f"\n--- Clicking Q{q_num} ---")
                btn.click()
                time.sleep(1.5)
                
                # Check visible containers
                containers = page.locator(SELECTORS["questionContainer"]).all()
                visible_containers = [c for c in containers if c.is_visible()]
                print(f"Total containers: {len(containers)}, Visible: {len(visible_containers)}")
                
                for idx, c in enumerate(visible_containers):
                    txt = c.inner_text().strip()
                    first_line = txt.split('\n')[0] if txt else 'EMPTY'
                    print(f"  Container {idx+1} first line: '{first_line}'")
            else:
                print(f"Q{q_num} button NOT found!")
    else:
        print("Xem lai bai lam button not found")
        
    context.close()
