#!/usr/bin/env python3
import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
TARGET_URL = "https://ngoaingu24h.vn/bai-hoc/bo-de-2026-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6615179587485696"

def inspect_question(page, q_num):
    print(f"\n================ INSPECTING QUESTION {q_num} ================")
    # Find question button in palette and click it
    btn_selectors = [
        f"button[id^='question-'] >> text=/^\\s*{q_num}\\s*$/",
        f"button >> text=/^\\s*{q_num}\\s*$/",
        f".question-palette-item >> text=/^\\s*{q_num}\\s*$/"
    ]
    
    btn = None
    for sel in btn_selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                btn = loc
                break
        except Exception:
            continue
            
    if btn:
        print(f"Clicking button for Q{q_num}...")
        btn.scroll_into_view_if_needed()
        btn.click()
        time.sleep(3.0)
    else:
        print(f"Warning: question button for {q_num} not found.")
        
    # Get passage container HTML
    eval_script = """
    () => {
        const containers = [
            ".reading-match-game-scroller", 
            ".passage-content", 
            ".reading-passage", 
            ".passage-text",
            ".quiz-game-full-test-exam-reading",
            ".game-object-question-extend-v2-text"
        ];
        
        const results = {};
        for (const selector of containers) {
            const el = document.querySelector(selector);
            if (el) {
                // Find all images inside this container
                const imgs = Array.from(el.querySelectorAll('img')).map(img => ({
                    src: img.src || img.getAttribute('src'),
                    alt: img.getAttribute('alt'),
                    className: img.className,
                    width: img.naturalWidth || img.width,
                    height: img.naturalHeight || img.height
                }));
                
                results[selector] = {
                    tagName: el.tagName,
                    className: el.className,
                    innerText: el.innerText ? el.innerText.substring(0, 500) : "",
                    innerHTML: el.innerHTML ? el.innerHTML.substring(0, 1000) : "",
                    images: imgs
                };
            }
        }
        
        // Also search for any visible images on the page
        const allImgs = Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src || img.getAttribute('src'),
            className: img.className,
            parentClass: img.parentElement ? img.parentElement.className : ""
        })).filter(img => img.src && (img.src.includes('comaiphuong') || img.src.includes('.blob')));
        
        results["all_relevant_images"] = allImgs;
        return results;
    }
    """
    
    res = page.evaluate(eval_script)
    for selector, info in res.items():
        if selector == "all_relevant_images":
            print("\n📸 All Relevant Images on Page:")
            for img in info:
                print(f"  - Src: {img['src']} | Class: {img['className']} | ParentClass: {img['parentClass']}")
        else:
            print(f"\n📦 Container '{selector}':")
            print(f"  - TagName: {info['tagName']}")
            print(f"  - ClassName: {info['className']}")
            print(f"  - InnerText (truncated): {repr(info['innerText'])}")
            print(f"  - InnerHTML (truncated): {repr(info['innerHTML'][:300])}")
            print(f"  - Images in container:")
            for img in info['images']:
                print(f"    * Src: {img['src']} | Width: {img['width']} | Height: {img['height']}")

def main():
    with sync_playwright() as p:
        print(f"Launching chromium headlessly with profile: {USER_DATA_DIR}")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=True,
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        print(f"Navigating to {TARGET_URL}...")
        page.goto(TARGET_URL)
        time.sleep(5.0)
        
        # Check if login is needed or if we are already logged in
        if "login" in page.url or page.locator("text=Đăng nhập").first.is_visible() and not page.locator("text=Xem lại bài làm").first.is_visible():
            print("❌ Error: Not logged in. Please log in first or run non-headlessly to log in.")
            context.close()
            return
            
        btn_review = page.locator("text=Xem lại bài làm").first
        if btn_review.count() > 0 and btn_review.is_visible():
            print("👉 Found 'Xem lại bài làm' button. Clicking it to enter review view...")
            btn_review.click()
            time.sleep(5.0)
            
        inspect_question(page, 131)
        inspect_question(page, 147)
        
        context.close()

if __name__ == "__main__":
    main()
