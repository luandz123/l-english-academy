import os
import time
import json
from playwright.sync_api import sync_playwright

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
url = "https://ngoaingu24h.vn/bai-hoc/de-thi-thuc-te-nua-dau-nam-2026-de-so-01-6688890497269760"

api_responses = []

with sync_playwright() as p:
    print("Launching chromium...")
    context = p.chromium.launch_persistent_context(
        user_data_dir=USER_DATA_DIR,
        headless=True,
        viewport={"width": 1280, "height": 800},
        args=["--disable-blink-features=AutomationControlled"]
    )
    page = context.pages[0] if context.pages else context.new_page()
    
    def handle_response(response):
        try:
            url_str = response.url
            try:
                text = response.text()
                if "discount" in text.lower() or "model 079" in text.lower():
                    api_responses.append({
                        "url": url_str,
                        "status": response.status,
                        "text": text
                    })
            except Exception:
                pass
        except Exception:
            pass
            
    page.on("response", handle_response)
    
    print("Navigating...")
    page.goto(url)
    time.sleep(5)
    
    btn_review = page.locator("text=Xem lại bài làm").first
    if btn_review.count() > 0 and btn_review.is_visible():
        print("Clicking Xem lai bai lam...")
        btn_review.click()
        time.sleep(15)
        
    print(f"Captured {len(api_responses)} responses.")
    # Search for Q97 content in captured responses
    for idx, resp in enumerate(api_responses):
        print(f"\nResponse {idx} matches query! URL: {resp['url']}")
        # Save payload to a file for complete inspection
        with open(f"payload_{idx}.json", "w", encoding="utf-8") as f:
            f.write(resp["text"])
        print(f"Saved to payload_{idx}.json")
            
    context.close()
