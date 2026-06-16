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
            # Let's get list of class names or check computed styles of all elements in the choice containers
            containers = page.locator(".game-object-quiz-wrap").all()
            for idx, c in enumerate(containers):
                if c.is_visible() and ("97." in c.inner_text() or "discount" in c.inner_text()):
                    # Let's inspect choice elements inside it
                    choices = c.locator(".quiz-choice-item").all()
                    for c_idx, choice in enumerate(choices):
                        print(f"Choice {c_idx} computed background-color/color:")
                        bg = choice.evaluate("el => window.getComputedStyle(el).backgroundColor")
                        color = choice.evaluate("el => window.getComputedStyle(el).color")
                        content = choice.locator(".quiz-choice-item-content")
                        content_bg = content.evaluate("el => window.getComputedStyle(el).backgroundColor") if content.count() > 0 else "N/A"
                        content_color = content.evaluate("el => window.getComputedStyle(el).color") if content.count() > 0 else "N/A"
                        print(f"  Container: bg='{bg}', color='{color}'")
                        print(f"  Content: bg='{content_bg}', color='{content_color}'")
                        
                        # Let's inspect icon svgs/paths too
                        icon = choice.locator(".quiz-choice-item-icon")
                        if icon.count() > 0:
                            icon_bg = icon.evaluate("el => window.getComputedStyle(el).backgroundColor")
                            icon_color = icon.evaluate("el => window.getComputedStyle(el).color")
                            print(f"  Icon: bg='{icon_bg}', color='{icon_color}'")
                            
                            # Let's check computed style of path
                            path = icon.locator("path")
                            if path.count() > 0:
                                path_fill = path.evaluate("el => window.getComputedStyle(el).fill")
                                path_stroke = path.evaluate("el => window.getComputedStyle(el).stroke")
                                print(f"    Path: fill='{path_fill}', stroke='{path_stroke}'")
        else:
            print("Button 97 not found")
    else:
        print("Review button not found")
        
    context.close()
