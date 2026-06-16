import os
import time
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
        
    # Click button 128
    btn_128 = page.locator("button[id^='question-'] >> text=/^\\s*128\\s*$/").first
    if btn_128.count() > 0:
        print("Clicking button 128...")
        btn_128.click()
        time.sleep(3)
        
        # Print the text of the first visible container
        containers = page.locator(".game-object-quiz-wrap, .question-detail-container, .quiz-item, .game-object-container").all()
        visible_containers = [c for c in containers if c.is_visible()]
        print(f"Found {len(visible_containers)} visible containers.")
        for idx, container in enumerate(visible_containers[:2]):
            print(f"\n--- Container {idx} ---")
            print(container.inner_text()[:400])
            
            # Let's search for "Part" in the container or parents
            print("\nSearching for Part text inside container:")
            part_texts = container.locator("text=/Part\\s*\\d+/i").all()
            for pt in part_texts:
                if pt.is_visible():
                    print(f"Found part text: {pt.inner_text()}")
    else:
        print("Button 128 not found.")
        
    context.close()
