#!/usr/bin/env python3
import os
import time
from playwright.sync_api import sync_playwright

USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".playwright_user_data")

def main():
    print("=========================================================")
    print("🔎 AUTOMATED PASSAGE SELECTOR DETECTOR")
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
        print("2. Once the page is loaded, return here and press [ENTER].")
        input("\nPress [ENTER] to start automated detection...")
        
        # Click Q131
        q_num = 131
        q_btn_selectors = [
            f"button[id^='question-'] >> text=/^\\s*{q_num}\\s*$/",
            f"button >> text=/^\\s*{q_num}\\s*$/"
        ]
        
        btn = None
        for sel in q_btn_selectors:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                btn = loc
                break
                
        if not btn:
            print(f"❌ Could not find palette button for Question {q_num}. Please navigate to Q131 manually on the browser.")
        else:
            print(f"Clicking Q{q_num}...")
            btn.scroll_into_view_if_needed()
            btn.click()
            
        print("Waiting 3 seconds for content to load...")
        time.sleep(3.0)
        
        # Now search the live DOM for "Riessler"
        eval_script = """
        () => {
            const elements = Array.from(document.querySelectorAll('*'));
            // Filter elements that contain the passage text
            const matches = elements.filter(el => {
                const text = el.innerText || "";
                return text.includes("Riessler Landscaping has everything") || text.includes("refer to the following flyer");
            });
            if (matches.length === 0) return null;
            
            // Sort by innerText length ascending to get the deepest element containing the text
            matches.sort((a, b) => a.innerText.length - b.innerText.length);
            
            const results = [];
            // Let's get details for the top 3 matches to see container levels
            for (let i = 0; i < Math.min(matches.length, 3); i++) {
                const el = matches[i];
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
                results.append = {
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    path: path.reverse(),
                    textSnippet: el.innerText.substring(0, 200)
                };
            }
            return {
                deepest: results.append, // Just return the list or first one
                allMatches: matches.map(el => ({
                    tagName: el.tagName,
                    className: el.className,
                    textLength: el.innerText.length,
                    classes: Array.from(el.classList)
                }))
            };
        }
        """
        
        # Let's write the JS script directly and robustly
        eval_script = """
        () => {
            const elements = Array.from(document.querySelectorAll('*'));
            const matches = elements.filter(el => {
                const text = el.innerText || "";
                return text.includes("Riessler Landscaping") || text.includes("refer to the following flyer");
            });
            if (matches.length === 0) return { error: "No elements matched" };
            
            // We want to find the container that contains the passage text
            // Let's list all elements containing the text, their tag name, class name, and parent classes
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
            # Sort by textLength ascending
            res.sort(key=lambda x: x["textLength"])
            for idx, el in enumerate(res[:15]):
                print(f"{idx+1}. <{el['tagName'].lower()} class=\"{el['className']}\"> (text length: {el['textLength']})")
        else:
            print("Unexpected response format:", res)
            
        context.close()

if __name__ == "__main__":
    main()
