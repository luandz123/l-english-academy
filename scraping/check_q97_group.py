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
            
            # Print page body or all visible containers if any
            # Let's search for elements containing Q97
            body_html = page.evaluate("() => document.body.innerHTML")
            # Let's look for elements containing 'qualify for a discount'
            # We will use python's bs4 to extract info or print it
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(body_html, 'html.parser')
            # Let's find any element containing text 'qualify for a discount'
            for el in soup.find_all(text=lambda t: t and 'qualify for a discount' in t.lower()):
                parent = el.parent
                # Go up to find a container
                while parent and parent.name != 'body':
                    if 'class' in parent.attrs and any(c in parent.attrs['class'] for c in ['game-object-container', 'question-detail-container', 'game-object-quiz-wrap']):
                        print("Found Container:", parent.name, parent.attrs.get('class'))
                        print(parent.prettify()[:2000])
                        break
                    parent = parent.parent
        else:
            print("Button 97 not found")
    else:
        print("Review button not found")
        
    context.close()
