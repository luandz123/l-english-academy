#!/usr/bin/env python3
import os
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
TARGET_URL = "https://ngoaingu24h.vn/bai-hoc/bo-de-2026-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6615179587485696"

def main():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=True,
            viewport={"width": 1280, "height": 800},
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(TARGET_URL)
        time.sleep(5.0)
        
        btn_review = page.locator("text=Xem lại bài làm").first
        if btn_review.count() > 0 and btn_review.is_visible():
            btn_review.click()
            time.sleep(5.0)
            
        # Click Q147
        btn = page.locator("button[id^='question-'] >> text=/^\\s*147\\s*$/").first
        if btn.count() > 0:
            btn.scroll_into_view_if_needed()
            btn.click()
            time.sleep(3.0)
            
        # Find all elements containing "What is the purpose of the notice?"
        eval_script = """
        () => {
            const elements = Array.from(document.querySelectorAll('*'));
            const matches = elements.filter(el => el.innerText && el.innerText.includes("What is the purpose of the notice?"));
            return matches.map(el => {
                let current = el;
                const path = [];
                while (current && current !== document.body) {
                    let desc = current.tagName.toLowerCase();
                    if (current.id) desc += '#' + current.id;
                    if (current.className) {
                        desc += '.' + Array.from(current.classList).join('.');
                    }
                    path.push(desc);
                    current = current.parentElement;
                }
                return {
                    tagName: el.tagName,
                    className: el.className,
                    text: el.innerText.substring(0, 150),
                    path: path.reverse()
                };
            });
        }
        """
        res = page.evaluate(eval_script)
        print("\n=== MATCHING QUESTION ELEMENTS FOR Q147 ===")
        for idx, item in enumerate(res):
            print(f"\nMatch {idx+1}:")
            print(f"Tag: {item['tagName']} | Class: {item['className']}")
            print(f"Text: {repr(item['text'])}")
            print("Path:")
            for node in item['path']:
                print(f"  ↳ {node}")
                
        context.close()

if __name__ == "__main__":
    main()
