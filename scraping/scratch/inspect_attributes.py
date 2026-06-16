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
            
        btn = page.locator("button[id^='question-'] >> text=/^\\s*181\\s*$/").first
        if btn.count() > 0:
            btn.scroll_into_view_if_needed()
            btn.click()
            time.sleep(4.0)
            
        eval_script = """
        () => {
            const wraps = Array.from(document.querySelectorAll('.game-object-quiz-wrap'));
            return wraps.map((wrap, idx) => {
                // Get all attributes of wrap
                const wrapAttrs = {};
                for (const attr of wrap.attributes) {
                    wrapAttrs[attr.name] = attr.value;
                }
                
                // Get attributes of children
                const childrenAttrs = Array.from(wrap.querySelectorAll('*')).map(el => {
                    const attrs = {};
                    for (const attr of el.attributes) {
                        attrs[attr.name] = attr.value;
                    }
                    return {
                        tagName: el.tagName,
                        className: el.className,
                        id: el.id,
                        attributes: attrs,
                        text: el.innerText ? el.innerText.trim().substring(0, 50) : ""
                    };
                }).filter(info => Object.keys(info.attributes).length > 0);
                
                return {
                    index: idx,
                    wrapAttributes: wrapAttrs,
                    childrenWithAttributes: childrenAttrs.slice(0, 20)
                };
            });
        }
        """
        res = page.evaluate(eval_script)
        for item in res:
            print(f"\n=== Wrap {item['index']} ===")
            print(f"Wrap Attributes: {item['wrapAttributes']}")
            print("Children with Attributes:")
            for child in item['childrenWithAttributes']:
                print(f"  <{child['tagName'].lower()} id=\"{child['id']}\" class=\"{child['className']}\" attrs={child['attributes']}> {repr(child['text'])}")
                
        context.close()

if __name__ == "__main__":
    main()
