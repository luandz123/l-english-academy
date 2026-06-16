import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
TARGET_URL = "https://ngoaingu24h.vn/bai-hoc/bo-de-2026-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-05-6263335866597376"

with sync_playwright() as p:
    print(f"Launching browser with profile: {USER_DATA_DIR}")
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800}
    )
    
    page = context.pages[0] if context.pages else context.new_page()
    
    print(f"Navigating to {TARGET_URL}...")
    page.goto(TARGET_URL)
    print("Waiting 5 seconds for page load...")
    time.sleep(5.0)
    
    # Click "Tiếp tục" or "Làm bài"
    btn_start = page.locator("button >> text=/^\\s*(Làm bài|Tiếp tục)\\s*$/").first
    if btn_start.count() > 0 and btn_start.is_visible():
        print(f"Clicking start/resume button: {btn_start.inner_text().strip()}")
        btn_start.click()
        time.sleep(4.0)
        
        # Audio check if present
        btn_audio = page.locator("button >> text=/^\\s*Âm thanh tốt, bắt đầu ngay!\\s*$/").first
        if btn_audio.count() > 0 and btn_audio.is_visible():
            print("Clicking 'Âm thanh tốt, bắt đầu ngay!'...")
            btn_audio.click()
            time.sleep(5.0)
            
        # Select an answer for the first question
        choices = page.locator(".quiz-choice-item, .answer-item, .choice-item, .game-object-question-extend-v2-choices-choice")
        if choices.count() > 0:
            print("Clicking the first answer choice...")
            choices.first.click()
            time.sleep(3.0)
            
        # Click "Submit"
        btn_submit = page.locator("button >> text=/^\\s*Submit\\s*$/").first
        if btn_submit.count() > 0 and not btn_submit.evaluate("el => el.disabled"):
            print("Clicking 'Submit' button...")
            btn_submit.click()
            time.sleep(3.0)
            
            # Click "Nộp bài"
            btn_confirm = page.locator("button >> text=/^\\s*Nộp bài\\s*$/").first
            if btn_confirm.count() > 0 and btn_confirm.is_visible():
                print("Clicking 'Nộp bài' confirmation button...")
                btn_confirm.click()
                print("Waiting 10 seconds for submission to complete...")
                time.sleep(10.0)
                
                print(f"Post-submit URL: {page.url}")
                print(f"Post-submit Title: {page.title()}")
                
                # Check for "Xem lại bài làm" button
                btn_review = page.locator("text=Xem lại bài làm").first
                print(f"Review button count: {btn_review.count()}, visible: {btn_review.is_visible() if btn_review.count() > 0 else False}")
                
                if btn_review.count() > 0 and btn_review.is_visible():
                    print("Clicking 'Xem lại bài làm'...")
                    btn_review.click()
                    time.sleep(5.0)
                    print(f"After review click URL: {page.url}")
                
                # Screenshot of final screen
                screenshot_path = os.path.join(SCRIPT_DIR, "debug_de_05_submitted.png")
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to {screenshot_path}")
                
                # Count question buttons to verify review view
                q_buttons = page.locator("button[id^='question-']").count()
                print(f"Final question buttons found: {q_buttons}")
        else:
            print("Submit button not clickable!")
    else:
        print("Start/Resume button NOT found!")
        
    context.close()
