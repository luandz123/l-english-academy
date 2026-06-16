#!/usr/bin/env python3
import os
from playwright.sync_api import sync_playwright

USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".playwright_user_data")

def main():
    print("=========================================================")
    print("🔎 MANUAL PASSAGE SELECTOR DETECTOR")
    print("=========================================================")
    
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            viewport=None,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        print("\n👉 ACTION REQUIRED:")
        print("1. Log in and open the exam review/explanation page in the browser.")
        print("2. Navigate to Q131 (Part 6) so the passage is fully visible on the left side.")
        print("3. Return here and press [ENTER].")
        input("\nPress [ENTER] to detect passage element...")
        
        # Search the live DOM for "Riessler"
        eval_script = """
        () => {
            const elements = Array.from(document.querySelectorAll('*'));
            // Filter elements that contain the passage text
            const matches = elements.filter(el => {
                const text = el.innerText || "";
                return text.includes("Riessler Landscaping") || text.includes("Look to Riessler Landscaping");
            });
            if (matches.length === 0) return { error: "No elements matched" };
            
            return matches.map(el => {
                return {
                    tagName: el.tagName,
                    className: el.className,
                    textLength: el.innerText.length,
                    classes: Array.from(el.classList)
                };
            });
        }
        """
        
        res = page.evaluate(eval_script)
        print("\n=== MATCHING ELEMENTS IN LIVE DOM ===")
        if isinstance(res, dict) and "error" in res:
            print(res["error"])
        elif isinstance(res, list):
            # Sort by textLength ascending to get the inner-most elements first
            res.sort(key=lambda x: x["textLength"])
            for idx, el in enumerate(res[:25]):
                print(f"{idx+1}. <{el['tagName'].lower()} class=\"{el['className']}\"> (text length: {el['textLength']})")
        else:
            print("Unexpected response format:", res)
            
        context.close()

if __name__ == "__main__":
    main()
