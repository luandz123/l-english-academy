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
    
    # Click 'Làm bài' button (MuiButton)
    btn_start = page.locator("button:has-text('Làm bài')").first
    if btn_start.count() > 0 and btn_start.is_visible():
        print("Clicking 'Làm bài' button...")
        
        # Try to catch new popup page if opens in new tab
        exam_page = None
        try:
            with context.expect_page(timeout=5000) as new_page_info:
                btn_start.click()
            exam_page = new_page_info.value
            print("Opened in a new tab!")
        except Exception:
            print("Did not open in a new tab. Checking current page...")
            exam_page = page
            
        time.sleep(6)
        
        # Check if "Âm thanh tốt, bắt đầu ngay!" is visible and click it
        audio_ok_btn = exam_page.locator("text='Âm thanh tốt, bắt đầu ngay!'").first
        if audio_ok_btn.count() > 0 and audio_ok_btn.is_visible():
            print("Found audio confirmation button. Clicking it...")
            audio_ok_btn.click()
            time.sleep(8)
            
        exam_page.wait_for_load_state()
        print(f"Exam page title: {exam_page.title()}")
        exam_page.screenshot(path=os.path.join(SCRIPT_DIR, "exam_started_robust.png"))
        
        # Look for submit button: "Nộp bài", "Nộp", "Hoàn thành"
        submit_btn = None
        for txt in ["Nộp bài", "Hoàn thành", "Nộp", "Submit"]:
            loc = exam_page.locator(f"text={txt}").first
            if loc.count() > 0 and loc.is_visible():
                submit_btn = loc
                break
                
        if not submit_btn:
            # Let's search for buttons inside the header/footer of exam view
            print("Searching for buttons on exam page...")
            btns = exam_page.locator("button").all()
            for btn in btns:
                txt = btn.inner_text().strip()
                if any(x in txt for x in ["Nộp", "Hoàn thành", "Submit"]):
                    submit_btn = btn
                    break
                    
        if submit_btn:
            print(f"Clicking submit button with text: '{submit_btn.inner_text()}'...")
            submit_btn.click()
            time.sleep(4)
            exam_page.screenshot(path=os.path.join(SCRIPT_DIR, "exam_confirm_robust.png"))
            
            # Click confirm modal: "Đồng ý", "Xác nhận", "Có", "OK"
            confirm_btn = None
            for txt in ["Đồng ý", "Xác nhận", "Có", "OK"]:
                loc = exam_page.locator(f"button >> text={txt}").first
                if loc.count() > 0 and loc.is_visible():
                    confirm_btn = loc
                    break
            if not confirm_btn:
                # Try finding modal buttons
                modal_btns = exam_page.locator("button").all()
                for btn in modal_btns:
                    if btn.is_visible() and btn.inner_text().strip() in ["Đồng ý", "Xác nhận", "Có", "OK", "Đồng ý nộp"]:
                        confirm_btn = btn
                        break
            if confirm_btn:
                print(f"Confirming submission with text: '{confirm_btn.inner_text()}'...")
                confirm_btn.click()
                time.sleep(6)
                exam_page.screenshot(path=os.path.join(SCRIPT_DIR, "exam_submitted_robust.png"))
                print("Submission confirmed successfully!")
            else:
                print("Confirm button not found in modal!")
        else:
            print("Submit button not found!")
            print("Visible texts: ", [b.inner_text().strip() for b in exam_page.locator("button, a").all() if b.is_visible()])
    else:
        print("Start button not found.")
        
    context.close()
