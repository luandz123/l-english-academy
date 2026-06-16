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

# Selectors to test
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
    print("🔍 COMPREHENSIVE TOEIC CRAWLER DIAGNOSTIC & VERIFICATION")
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
        
        if page.url == "about:blank":
            page.goto("https://ngoaingu24h.vn")
            
        print("\n👉 ACTION REQUIRED:")
        print("1. Log in and open the exam review page in the browser.")
        print("2. Once page is ready, return here and press [ENTER].")
        input("\nPress [ENTER] to start verification...")
        
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
        
        test_questions = [1, 32, 71, 101, 131, 147]
        results = {}
        
        for q_num in test_questions:
            print(f"\n--- Testing Question {q_num} ---")
            
            btn = get_question_button(page, q_num)
            if not btn:
                print(f"❌ Could not find palette button for Question {q_num}")
                continue
                
            btn.scroll_into_view_if_needed()
            btn.click()
            print(f"Clicked Q{q_num}. Waiting 2.5s...")
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
                
            # Text
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
                # Find all elements containing text indicating passage
                js_detect = """
                () => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    const matches = elements.filter(el => {
                        const t = el.innerText || "";
                        // Look for passage keywords or specific known words in our test questions
                        return t.includes("refer to the following flyer") || 
                               t.includes("refer to the following notice") || 
                               t.includes("Riessler Landscaping") || 
                               t.includes("Dear High View Apartments Resident");
                    });
                    if (matches.length === 0) return null;
                    
                    // Sort by text length ascending to get innermost element
                    matches.sort((a, b) => a.innerText.length - b.innerText.length);
                    const deepest = matches[0];
                    
                    // Find all parents to see which one looks like a passage container
                    let current = deepest;
                    const containers = [];
                    while (current && current !== document.body) {
                        const classes = Array.from(current.classList);
                        if (classes.length > 0) {
                            containers.push({
                                tagName: current.tagName.toLowerCase(),
                                className: current.className,
                                textLength: current.innerText.length
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
                    # Find a suitable container class (e.g. not matching the deepest element itself, but a wrapper)
                    # Let's search for classes like 'scroller', 'content', 'match', or look for the largest size wrapper
                    suitable_class = ""
                    for c in det_res["containers"]:
                        cls_str = c["className"]
                        if any(k in cls_str for k in ["scroll", "content", "passage", "left", "widget"]):
                            suitable_class = cls_str
                            break
                    if not suitable_class and det_res["containers"]:
                        suitable_class = det_res["containers"][-1]["className"]
                    passage_class = suitable_class
                    print(f"👉 Detected Passage Container: {passage_class}")
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
