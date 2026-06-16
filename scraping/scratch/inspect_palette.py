#!/usr/bin/env python3
import os
import time
from playwright.sync_api import sync_playwright

USER_DATA_DIR = "/home/luan/Desktop/l-english-academy/scraping/.playwright_user_data"
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
            
        eval_script = """
        () => {
            // Find the palette container
            // Let's inspect some of the question buttons and their parents/siblings
            const buttons = Array.from(document.querySelectorAll('button[id^="question-"]'));
            if (buttons.length === 0) return "No question buttons found";
            
            const btnInfo = buttons.slice(170, 195).map(btn => {
                const parent = btn.parentElement;
                return {
                    id: btn.id,
                    text: btn.innerText.trim(),
                    className: btn.className,
                    parentTagName: parent ? parent.tagName : "",
                    parentClassName: parent ? parent.className : "",
                    parentStyle: parent ? parent.getAttribute('style') : ""
                };
            });
            
            // Let's also find parent wrappers of these buttons
            const parents = Array.from(new Set(buttons.map(b => b.parentElement)));
            const parentsInfo = parents.map((p, idx) => ({
                index: idx,
                tagName: p.tagName,
                className: p.className,
                childCount: p.children.length,
                innerHTML: p.innerHTML.substring(0, 200)
            }));
            
            return {
                buttonsSample: btnInfo,
                parentsSample: parentsInfo
            };
        }
        """
        res = page.evaluate(eval_script)
        import pprint
        pprint.pprint(res)
        
        context.close()

if __name__ == "__main__":
    main()
