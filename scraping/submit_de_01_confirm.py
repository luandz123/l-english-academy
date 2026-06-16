import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6312161850687488"

with sync_playwright() as p:
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = context.pages[0] if context.pages else context.new_page()
    page.goto(url)
    time.sleep(6)
    
    # Click 'Tiếp tục' or 'Làm bài'
    btn = page.locator("button:has-text('Tiếp tục'), button:has-text('Làm bài')").first
    if btn.count() > 0 and btn.is_visible():
        print(f"Clicking '{btn.inner_text().strip()}' button...")
        btn.click()
        time.sleep(8)
        
        # Audio ok button if present
        audio_ok_btn = page.locator("text='Âm thanh tốt, bắt đầu ngay!'").first
        if audio_ok_btn.count() > 0 and audio_ok_btn.is_visible():
            print("Clicking audio confirm...")
            audio_ok_btn.click()
            time.sleep(8)
            
        print(f"Current page title: {page.title()}")
        
        # Expand Part 5
        print("Expanding Part 5...")
        part5_header = page.locator("text='Part 5'").first
        if part5_header.count() > 0:
            part5_header.click()
            time.sleep(3)
            
        # Click on Question 101
        print("Clicking Question 101 button...")
        q101_btn = page.locator("button[id^='question-'] >> text=/^\\s*101\\s*$/").first
        if q101_btn.count() > 0 and q101_btn.is_visible():
            q101_btn.click()
            time.sleep(4)
            
        # Choose Choice A for Question 101
        print("Answering Choice A for Question 101...")
        choice_a = page.locator(".quiz-choice-item, .answer-item, .choice-item").first
        if choice_a.count() > 0 and choice_a.is_visible():
            choice_a.click()
            print("Selected Choice A.")
            time.sleep(4)
        else:
            print("Could not find choice options to click!")
            
        # Check Submit button again
        submit_btn = page.locator("button:has-text('Submit')").first
        if submit_btn.count() > 0 and submit_btn.is_visible():
            print(f"Submit button. Enabled: {submit_btn.is_enabled()}")
            if not submit_btn.is_enabled():
                print("Submit is still disabled. Trying to force click or inspect parent/attributes...")
                print(f"Submit outer HTML: {submit_btn.evaluate('el => el.outerHTML')}")
                # Try clicking it anyway by bypassing Playwright's actionability checks (force=True)
                try:
                    print("Force clicking Submit...")
                    submit_btn.click(force=True)
                    time.sleep(4)
                    page.screenshot(path=os.path.join(SCRIPT_DIR, "after_force_submit.png"))
                except Exception as e:
                    print(f"Force click error: {e}")
            else:
                submit_btn.click()
                time.sleep(4)
                
            # Look for confirm button in dialog
            confirm_btn = None
            for txt in ["Đồng ý", "Xác nhận", "Có", "OK", "Đồng ý nộp"]:
                loc = page.locator(f"button:has-text('{txt}')").first
                if loc.count() > 0 and loc.is_visible():
                    confirm_btn = loc
                    break
            if not confirm_btn:
                dialog_buttons = page.locator("[role='dialog'] button, .MuiDialog-root button").all()
                if dialog_buttons:
                    confirm_btn = dialog_buttons[-1]
                    
            if confirm_btn:
                print(f"Clicking confirm button: '{confirm_btn.inner_text().strip()}'")
                confirm_btn.click(force=True)
                time.sleep(6)
                print("Exam submitted successfully!")
            else:
                print("Confirm button not found!")
        else:
            print("Submit button not found!")
    else:
        print("Start/Resume button not found.")
        
    context.close()
