#!/usr/bin/env python3
import os
import sys
import json
import time
import re
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
SCREENSHOTS_DIR = os.path.join(SCRIPT_DIR, "diagnostic_screenshots")
REPORT_PATH = os.path.join(SCRIPT_DIR, "diagnostic_report.md")

os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

TARGET_URL = "https://ngoaingu24h.vn/bai-hoc/bo-de-2026-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6615179587485696"

SELECTORS = {
    "questionButtons": "button[id^='question-']",
    "questionContainer": ".game-object-quiz-wrap",
    "questionText": ".game-object-question-extend-v2-text, .game-object-question-text, .quiz-question-title",
    "questionImage": "img.image-preview, .game-image-widget img, img[src*='upload'], img[src*='comaiphuong']",
    "answerItems": ".quiz-choice-item",
    "answerText": ".quiz-choice-item-content",
    "correctAnswerClass": ".correct, .is-correct",
    "explanationContainer": ".game-object-explanation-content",
}

def clean_answer_prefix(text):
    if not text:
        return ""
    return re.sub(r'^[A-D][\.\:\-\s\)]+', '', text).strip()

def get_question_button(page, num):
    selectors = [
        f"button[id^='question-'] >> text=/^\\s*{num}\\s*$/",
        f"button >> text=/^\\s*{num}\\s*$/",
        f".question-palette-item >> text=/^\\s*{num}\\s*$/",
        f".palette-item >> text=/^\\s*{num}\\s*$/"
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0 and loc.is_visible():
                return loc
        except Exception:
            continue
    return None

def main():
    print("=========================================================")
    print("🚀 RUNNING AUTOMATED TOEIC CRAWLER DIAGNOSTIC")
    print("=========================================================")
    
    captured_audios = []
    
    with sync_playwright() as p:
        print(f"Launching browser using profile: {USER_DATA_DIR}")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            viewport=None,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        # Audio interception
        def handle_response(response):
            try:
                url = response.url
                content_type = response.headers.get("content-type", "").lower()
                if "audio" in content_type or any(ext in url.lower() for ext in [".mp3", ".wav", ".ogg", ".m4a"]):
                    if url not in captured_audios:
                        captured_audios.append(url)
                        print(f"🎵 Captured Audio URL: {url}")
            except Exception:
                pass
        page.on("response", handle_response)
        
        print(f"Navigating directly to: {TARGET_URL}")
        page.goto(TARGET_URL)
        print("Waiting 6 seconds for page and session to load...")
        time.sleep(6.0)
        
        # Check if login is needed
        if "login" in page.url or page.url == "https://ngoaingu24h.vn/":
            print("⚠️ Warning: Session not active. You must log in first!")
            print("Please log in on the browser window and open the review page.")
            print("I will wait 20 seconds for you to do this...")
            time.sleep(20.0)
            
        # Click "Xem lại bài làm" if present
        btn_review = page.locator("text=Xem lại bài làm").first
        if btn_review.count() > 0 and btn_review.is_visible():
            print("👉 Found 'Xem lại bài làm' button. Clicking it...")
            btn_review.click()
            print("Waiting 5 seconds for the review page to load...")
            time.sleep(5.0)
        else:
            # Maybe we are already on the review page
            print("ℹ️ 'Xem lại bài làm' button not found. Assuming we are already on the review page.")
            
        test_questions = [1, 32, 71, 101, 131, 147]
        results = {}
        
        for q_num in test_questions:
            print(f"\n--- Testing Question {q_num} ---")
            
            btn = get_question_button(page, q_num)
            if not btn:
                print(f"❌ Could not find palette button for Question {q_num}")
                page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"error_Q{q_num}.png"))
                continue
                
            btn.scroll_into_view_if_needed()
            btn.click()
            print(f"Clicked Q{q_num}. Waiting 2.5s for DOM to load...")
            time.sleep(2.5)
            
            # Find active visible container
            active_container = None
            for c in page.locator(SELECTORS["questionContainer"]).all():
                if c.is_visible():
                    active_container = c
                    break
                    
            if not active_container:
                print(f"❌ No visible container for Q{q_num}")
                continue
                
            # Question Text
            q_text = ""
            try:
                q_txt_loc = active_container.locator(SELECTORS["questionText"]).first
                if q_txt_loc.count() > 0:
                    q_text = q_txt_loc.inner_text().strip()
            except Exception as e:
                print(f"Error parsing question text: {e}")
                
            # Image
            img_url = None
            try:
                img_loc = active_container.locator(SELECTORS["questionImage"]).first
                if img_loc.count() > 0 and img_loc.is_visible():
                    img_url = img_loc.get_attribute("src")
            except Exception:
                pass
                
            # Choices
            choices = []
            try:
                ans_items = active_container.locator(SELECTORS["answerItems"]).all()
                for idx, ans_el in enumerate(ans_items):
                    txt_loc = ans_el.locator(SELECTORS["answerText"]).first
                    raw_text = txt_loc.inner_text().strip() if txt_loc.count() > 0 else ans_el.inner_text().strip()
                    ans_text = clean_answer_prefix(raw_text)
                    
                    is_correct = False
                    if txt_loc.count() > 0:
                        cls = txt_loc.get_attribute("class") or ""
                        if "correct" in cls or "success" in cls:
                            is_correct = True
                    if not is_correct:
                        cls = ans_el.get_attribute("class") or ""
                        if "correct" in cls or "success" in cls:
                            is_correct = True
                    if not is_correct:
                        for c_cls in [".correct", ".is-correct", ".success"]:
                            if ans_el.locator(c_cls).count() > 0:
                                is_correct = True
                                break
                                
                    choices.append({
                        "index": idx,
                        "text": ans_text,
                        "is_correct": is_correct
                    })
            except Exception as e:
                print(f"Error parsing choices: {e}")
                
            # Explanation
            explanation = ""
            try:
                exp_loc = active_container.locator(SELECTORS["explanationContainer"]).first
                if exp_loc.count() > 0 and exp_loc.is_visible():
                    explanation = exp_loc.inner_text().strip()
            except Exception:
                pass
                
            # Passage detection using JS inside the page
            passage_text = ""
            passage_class = ""
            try:
                js_detect = """
                () => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    const matches = elements.filter(el => {
                        const t = el.innerText || "";
                        return t.includes("refer to the following flyer") || 
                               t.includes("refer to the following notice") || 
                               t.includes("Riessler Landscaping") || 
                               t.includes("Dear High View Apartments Resident");
                    });
                    if (matches.length === 0) return null;
                    matches.sort((a, b) => a.innerText.length - b.innerText.length);
                    const deepest = matches[0];
                    let current = deepest;
                    const containers = [];
                    while (current && current !== document.body) {
                        const classes = Array.from(current.classList);
                        if (classes.length > 0) {
                            containers.push({
                                tagName: current.tagName.toLowerCase(),
                                className: current.className
                            });
                        }
                        current = current.parentElement;
                    }
                    return {
                        text: deepest.innerText,
                        containers: containers
                    };
                }
                """
                det_res = page.evaluate(js_detect)
                if det_res:
                    passage_text = det_res["text"]
                    suitable_class = ""
                    for c in det_res["containers"]:
                        cls_str = c["className"]
                        if any(k in cls_str for k in ["scroll", "content", "passage", "left", "widget"]):
                            suitable_class = cls_str
                            break
                    if not suitable_class and det_res["containers"]:
                        suitable_class = det_res["containers"][-1]["className"]
                    passage_class = suitable_class
            except Exception as e:
                print(f"Error executing passage detection JS: {e}")
                
            ss_path = os.path.join(SCREENSHOTS_DIR, f"Q{q_num}.png")
            page.screenshot(path=ss_path)
            
            results[q_num] = {
                "question_text": q_text,
                "image_url": img_url,
                "choices": choices,
                "explanation": explanation[:200] + "..." if len(explanation) > 200 else explanation,
                "passage_text": passage_text[:200] + "..." if len(passage_text) > 200 else passage_text,
                "passage_class": passage_class,
                "screenshot": ss_path
            }
            
            print(f"   Text: '{q_text[:60]}...'")
            print(f"   Image: {img_url}")
            print(f"   Choices: {[{c['text']: c['is_correct']} for c in choices]}")
            print(f"   Explanation found: {bool(explanation)}")
            print(f"   Passage found: {bool(passage_text)} (class: {passage_class})")
            
        with open(REPORT_PATH, "w", encoding="utf-8") as rf:
            rf.write("# TOEIC Crawler Selector Diagnostic Report\n\n")
            rf.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            rf.write("## 🎵 Intercepted Audio Requests\n")
            if captured_audios:
                for idx, aud in enumerate(captured_audios):
                    rf.write(f"{idx+1}. `{aud}`\n")
            else:
                rf.write("*No audio requests intercepted.*\n")
            rf.write("\n")
            
            rf.write("## 📊 Question Scrapes by Part\n\n")
            for q_num, data in results.items():
                rf.write(f"### Question {q_num}\n")
                rf.write(f"- **Question Text:** `{data['question_text']}`\n")
                rf.write(f"- **Image URL:** `{data['image_url']}`\n")
                rf.write(f"- **Passage Class:** `{data['passage_class']}`\n")
                rf.write("- **Choices:**\n")
                for c in data["choices"]:
                    status = "✅ Correct" if c["is_correct"] else "❌ Incorrect"
                    rf.write(f"  - Option {c['index']+1}: `{c['text']}` ({status})\n")
                rf.write(f"- **Passage Snippet:**\n```text\n{data['passage_text']}\n```\n")
                rf.write(f"- **Explanation Snippet:**\n```text\n{data['explanation']}\n```\n")
                rf.write(f"- **Screenshot:** [View Screenshot](file://{data['screenshot']})\n\n")
                rf.write("---\n\n")
                
        print("\n=========================================================")
        print(f"✅ DIAGNOSTIC COMPLETE! Report written to: {REPORT_PATH}")
        print("=========================================================")
        context.close()

if __name__ == "__main__":
    main()
