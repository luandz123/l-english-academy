#!/usr/bin/env python3
import os
from playwright.sync_api import sync_playwright

USER_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".playwright_user_data")

def main():
    print("=========================================================")
    print("🔍 PASSAGE SELECTOR DETECTOR")
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
        print("1. Open the review page on the browser.")
        print("2. Navigate to Question 131 or any question in Part 6/7 with a passage.")
        print("3. Press [ENTER] here once the passage is visible.")
        input("\nPress [ENTER] to detect passage element...")
        
        # Search for elements containing "Look to Riessler Landscaping" or "refer to the following"
        search_terms = ["Look to Riessler Landscaping", "refer to the following", "Riessler Landscaping has everything"]
        
        found = False
        for term in search_terms:
            try:
                # Use evaluate to find elements containing the text and get their hierarchy
                eval_script = f"""
                () => {{
                    const elements = Array.from(document.querySelectorAll('*'));
                    const matches = elements.filter(el => el.innerText && el.innerText.includes("{term}"));
                    if (matches.length === 0) return null;
                    
                    // Sort by innerText length ascending to get the deepest element
                    matches.sort((a, b) => a.innerText.length - b.innerText.length);
                    const deepest = matches[0];
                    
                    // Trace parents
                    let current = deepest;
                    const path = [];
                    while (current && current !== document.body) {{
                        let desc = current.tagName.toLowerCase();
                        if (current.id) desc += '#' + current.id;
                        if (current.className) {{
                            desc += '.' + Array.from(current.classList).join('.');
                        }}
                        path.push(desc);
                        current = current.parentElement;
                    }}
                    return {{
                        tagName: deepest.tagName,
                        className: deepest.className,
                        id: deepest.id,
                        html: deepest.outerHTML.substring(0, 1000),
                        path: path.reverse()
                    }};
                }}
                """
                res = page.evaluate(eval_script)
                if res:
                    print(f"\n🎉 FOUND ELEMENT for term: '{term}'")
                    print(f"Tag: {res['tagName']}")
                    print(f"ID: {res['id']}")
                    print(f"Class: {res['className']}")
                    print("\nHierarchy:")
                    for idx, node in enumerate(res['path']):
                        print(f"  {'  ' * idx}↳ {node}")
                    found = True
                    break
            except Exception as e:
                print(f"Error checking term '{term}': {e}")
                
        if not found:
            print("\n❌ Could not locate the passage element. Let's dump all visible text elements on the left side of the screen.")
            try:
                divs = page.locator("div").all()
                for d in divs:
                    if d.is_visible():
                        box = d.bounding_box()
                        if box and box["x"] < 400 and box["width"] > 300 and box["height"] > 300:
                            txt = d.inner_text().strip()
                            if len(txt) > 100:
                                cls = d.get_attribute("class") or ""
                                print(f"- Div Class: '{cls}' | Width: {box['width']} | Text start: '{txt[:100]}...'")
            except Exception as e:
                print(f"Error dumping left-side divs: {e}")
                
        context.close()

if __name__ == "__main__":
    main()
