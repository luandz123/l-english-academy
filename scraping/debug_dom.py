#!/usr/bin/env python3
import os
import sys
import json
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")
REPORT_FILE = os.path.join(SCRIPT_DIR, "dom_debug_report.txt")

# Define target selectors to test
SELECTORS_TO_TEST = {
    "questionButtons": [
        ".question-palette-item",
        ".palette-item",
        ".quiz-nav-button",
        "button[id^='question-']",
        "button",
        "a",
        "div"
    ],
    "questionContainer": [
        ".question-detail-container",
        ".quiz-item",
        ".game-object-container",
        ".game-object-para-children"
    ],
    "questionText": [
        ".question-text",
        ".quiz-question-title",
        ".question-title",
        ".game-object-question-text"
    ],
    "questionImage": [
        "img.question-img",
        ".question-image img",
        "img[src*='upload']",
        "img.image-preview",
        "img"
    ],
    "questionAudio": [
        "audio source",
        "audio"
    ],
    "answerItems": [
        ".answer-item",
        ".choice-item",
        ".quiz-choice-item",
        ".quiz-answer",
        ".quiz-choice-item-wrap"
    ],
    "answerText": [
        ".answer-text",
        ".choice-text",
        ".quiz-choice-item-content"
    ],
    "correctAnswerClass": [
        ".correct",
        ".is-correct",
        ".answer-correct",
        ".success"
    ],
    "explanationContainer": [
        ".explanation-content",
        ".game-object-explanation-content",
        ".explanation",
        ".game-object-question-explanation-para"
    ],
    "transcriptText": [
        ".transcript-content",
        ".transcript"
    ],
    "translationText": [
        ".translation-content",
        ".translation",
        ".vietnamese-translate"
    ],
    "passageContainer": [
        ".reading-match-game-scroller",
        ".passage-content",
        ".reading-passage",
        ".passage-text",
        ".reading-match-game-left-side"
    ]
}

def print_and_log(msg, file_handle):
    print(msg)
    file_handle.write(msg + "\n")

def main():
    print("=========================================================")
    print("🔍 NGOAINGU24H DOM STRUCTURE DEBUGGER")
    print("=========================================================")

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        print_and_log(f"Starting DOM structural audit...", f)
        
        with sync_playwright() as p:
            print_and_log(f"Opening browser using context: {USER_DATA_DIR}", f)
            context = p.chromium.launch_persistent_context(
                user_data_dir=USER_DATA_DIR,
                headless=False,
                viewport=None,
                args=["--disable-blink-features=AutomationControlled"]
            )
            
            page = context.pages[0] if context.pages else context.new_page()
            
            # Navigate to the target site if not already open
            if page.url == "about:blank":
                page.goto("https://ngoaingu24h.vn")
                
            print_and_log("\n👉 INSTRUCTIONS:", f)
            print_and_log("1. Login to your ngoaingu24h.vn account on the browser window.", f)
            print_and_log("2. Open the exam review/explanation page of the test.", f)
            print_and_log("3. Once the page has loaded and you can see the question text, answers, and audio player...", f)
            print_and_log("4. Press [ENTER] here in this terminal to scan the DOM structure.", f)
            
            input("\nPress [ENTER] to start DOM scanning...")
            
            print_and_log(f"\nScanning active page: {page.url}", f)
            print_and_log(f"Page Title: {page.title()}", f)
            print_and_log("-" * 50, f)

            # 1. Test Question Navigation Buttons
            print_and_log("\n--- [1] QUESTION PALETTE BUTTONS ---", f)
            found_buttons_selector = None
            for sel in SELECTORS_TO_TEST["questionButtons"]:
                try:
                    locs = page.locator(sel)
                    cnt = locs.count()
                    if cnt > 0:
                        # Try to filter for numbers 1 to 200
                        num_matched = 0
                        matched_texts = []
                        for idx in range(min(cnt, 20)):
                            txt = locs.nth(idx).inner_text().strip()
                            if txt.isdigit() and int(txt) <= 200:
                                num_matched += 1
                                matched_texts.append(txt)
                        
                        if num_matched > 0:
                            print_and_log(f"✅ Match: Selector '{sel}' found {cnt} elements. Sample numbers: {matched_texts[:10]}", f)
                            found_buttons_selector = sel
                            break
                        else:
                            print_and_log(f"ℹ️ Found {cnt} elements with selector '{sel}', but they don't contain question numbers.", f)
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)
            
            if not found_buttons_selector:
                print_and_log("⚠️ Warning: No question navigation buttons found using standard selectors.", f)

            # 2. Test Question Container
            print_and_log("\n--- [2] QUESTION DETAIL CONTAINER ---", f)
            active_container_selector = None
            active_container = page
            
            for sel in SELECTORS_TO_TEST["questionContainer"]:
                try:
                    locs = page.locator(sel)
                    if locs.count() > 0:
                        visible_locs = [locs.nth(i) for i in range(locs.count()) if locs.nth(i).is_visible()]
                        if visible_locs:
                            tag_name = visible_locs[0].evaluate("el => el.tagName")
                            class_name = visible_locs[0].evaluate("el => el.className")
                            print_and_log(f"✅ Match: Selector '{sel}' is visible. Tag: <{tag_name.lower()}>, Class: '{class_name}'", f)
                            active_container_selector = sel
                            active_container = visible_locs[0]
                            break
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)
                    
            if not active_container_selector:
                print_and_log("ℹ️ No active container selector was matched. Falling back to page scope.", f)

            # 3. Test Question Text
            print_and_log("\n--- [3] QUESTION TEXT ---", f)
            for sel in SELECTORS_TO_TEST["questionText"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0 and locs.first.is_visible():
                        txt = locs.first.inner_text().strip()
                        print_and_log(f"✅ Match: Selector '{sel}' matches. Text: '{txt[:100]}...'", f)
                        break
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)

            # 4. Test Question Image
            print_and_log("\n--- [4] QUESTION IMAGE ---", f)
            for sel in SELECTORS_TO_TEST["questionImage"]:
                try:
                    locs = active_container.locator(sel)
                    # Check if visible and has valid source
                    matched = False
                    for idx in range(locs.count()):
                        img = locs.nth(idx)
                        if img.is_visible():
                            src = img.get_attribute("src")
                            if src and ("upload" in src or "static" in src or "ngoaingu24h" in src or src.startswith("http")):
                                print_and_log(f"✅ Match: Selector '{sel}' matches. Src: '{src}'", f)
                                matched = True
                                break
                    if matched:
                        break
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)

            # 5. Test Question Audio
            print_and_log("\n--- [5] QUESTION AUDIO ---", f)
            for sel in SELECTORS_TO_TEST["questionAudio"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0:
                        # Print src attributes
                        for idx in range(locs.count()):
                            aud = locs.nth(idx)
                            src = aud.evaluate("el => el.src || el.currentSrc || el.getAttribute('src')")
                            print_and_log(f"✅ Match: Selector '{sel}' found element. Resolved Src: '{src}'", f)
                        break
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)

            # 6. Test Answers List & Correct Class
            print_and_log("\n--- [6] ANSWER ITEMS AND CORRECTNESS ---", f)
            found_answers_selector = None
            for sel in SELECTORS_TO_TEST["answerItems"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0:
                        print_and_log(f"✅ Match: Selector '{sel}' found {locs.count()} answer choices.", f)
                        found_answers_selector = sel
                        
                        # Print choices and test correctness check
                        for idx in range(locs.count()):
                            choice = locs.nth(idx)
                            
                            # Text
                            raw_text = choice.inner_text().strip()
                            for t_sel in SELECTORS_TO_TEST["answerText"]:
                                try:
                                    txt_loc = choice.locator(t_sel).first
                                    if txt_loc.count() > 0:
                                        raw_text = txt_loc.inner_text().strip()
                                        break
                                except Exception:
                                    pass
                                    
                            # Correctness
                            is_correct = False
                            correct_reason = "none"
                            for cls in SELECTORS_TO_TEST["correctAnswerClass"]:
                                if choice.locator(cls).count() > 0:
                                    is_correct = True
                                    correct_reason = f"contains element '{cls}'"
                                    break
                            
                            if not is_correct:
                                cls_attr = choice.get_attribute("class") or ""
                                if "correct" in cls_attr or "success" in cls_attr:
                                    is_correct = True
                                    correct_reason = f"class list has correct/success"
                            
                            if not is_correct:
                                if choice.get_attribute("data-correct") == "true":
                                    is_correct = True
                                    correct_reason = "data-correct attribute is true"
                                    
                            print_and_log(f"   Option {idx+1}: '{raw_text}' | Correct: {is_correct} ({correct_reason})", f)
                        break
                except Exception as e:
                    print_and_log(f"❌ Error testing '{sel}': {e}", f)

            # 7. Test Explanations / Transcripts
            print_and_log("\n--- [7] EXPLANATIONS & TRANSCRIPTS ---", f)
            for sel in SELECTORS_TO_TEST["explanationContainer"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0 and locs.first.is_visible():
                        txt = locs.first.inner_text().strip()
                        print_and_log(f"✅ Match (Explanation): Selector '{sel}' matches. Content: '{txt[:100]}...'", f)
                        break
                except Exception:
                    pass
            for sel in SELECTORS_TO_TEST["transcriptText"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0 and locs.first.is_visible():
                        txt = locs.first.inner_text().strip()
                        print_and_log(f"✅ Match (Transcript): Selector '{sel}' matches. Content: '{txt[:100]}...'", f)
                        break
                except Exception:
                    pass
            for sel in SELECTORS_TO_TEST["translationText"]:
                try:
                    locs = active_container.locator(sel)
                    if locs.count() > 0 and locs.first.is_visible():
                        txt = locs.first.inner_text().strip()
                        print_and_log(f"✅ Match (Translation): Selector '{sel}' matches. Content: '{txt[:100]}...'", f)
                        break
                except Exception:
                    pass

            # 8. Test Passage Container (Part 6 & 7)
            print_and_log("\n--- [8] READING PASSAGE CONTAINER (Part 6/7) ---", f)
            for sel in SELECTORS_TO_TEST["passageContainer"]:
                try:
                    locs = page.locator(sel)
                    if locs.count() > 0 and locs.first.is_visible():
                        txt = locs.first.inner_text().strip()
                        print_and_log(f"✅ Match: Selector '{sel}' matches. Content: '{txt[:100]}...'", f)
                        break
                except Exception:
                    pass

            print_and_log("\n" + "="*50, f)
            print_and_log(f"Audit completed! Report saved to: {REPORT_FILE}", f)
            print_and_log("="*50, f)
            
            context.close()

if __name__ == "__main__":
    main()
