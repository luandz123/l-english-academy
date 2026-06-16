#!/usr/bin/env python3
import os
import sys
import json
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")

def main():
    with sync_playwright() as p:
        print(f"Launching chromium...")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=True,
            args=["--disable-blink-features=AutomationControlled"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        
        # Load the base URL first to establish any cookies/session
        page.goto("https://ngoaingu24h.vn/tat-ca-khoa-hoc")
        page.wait_for_timeout(3000)
        
        # Fetch courses via page.evaluate
        api_url = "https://ngoaingu24h.vn/api/get-all-courses?limit=200&offset=0"
        print(f"Fetching: {api_url}")
        
        js_code = f"""
        fetch("{api_url}")
            .then(res => res.json())
            .then(data => data)
        """
        
        try:
            result = page.evaluate(js_code)
            print(f"Success! Retrieved type: {type(result)}")
            
            # Save results to a file for review
            output_file = os.path.join(SCRIPT_DIR, "all_courses_api.json")
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            print(f"Saved all courses to: {output_file}")
            
            # Print courses matching "bộ đề"
            courses = result if isinstance(result, list) else result.get("courses", result.get("data", []))
            print(f"Number of courses returned: {len(courses)}")
            
            print("\nMatching courses:")
            for idx, c in enumerate(courses):
                title = c.get("name") or c.get("title") or ""
                slug = c.get("slug") or c.get("id") or ""
                course_id = c.get("_id") or c.get("id") or ""
                print(f"{idx+1}. [{title}] - Slug: {slug} - ID: {course_id}")
                
        except Exception as e:
            print(f"Error fetching API: {e}")
            
        context.close()

if __name__ == "__main__":
    main()
