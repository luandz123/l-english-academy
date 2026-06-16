#!/usr/bin/env python3
import os
import sys
import json
import time
import random
import re
import hashlib
import math
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
def get_checkpoint_path(url_slug):
    return os.path.join(SCRIPT_DIR, f"checkpoint_{url_slug}.json")
USER_DATA_DIR = os.path.join(SCRIPT_DIR, ".playwright_user_data")

# Unified, highly robust selectors
SELECTORS = {
    "questionButtons": "button[id^='question-']",
    "questionContainer": ".game-object-quiz-wrap, .question-detail-container, .quiz-item, .game-object-container",
    "questionText": ".game-object-question-extend-v2-text, .game-object-question-text, .quiz-question-title, .question-text",
    "questionImage": "img.image-preview, .game-image-widget img, img[src*='upload'], img[src*='comaiphuong']",
    "answerItems": ".quiz-choice-item, .answer-item, .choice-item",
    "answerText": ".quiz-choice-item-content, .answer-text, .choice-text",
    "correctAnswerClass": ".correct, .is-correct, .success",
    "explanationContainer": ".game-object-explanation-content, .explanation-content, .explanation",
    "transcriptText": ".transcript-content, .transcript",
    "translationText": ".translation-content, .translation, .vietnamese-translate",
    "passageContainer": ".reading-match-left-view .game-object-question-extend-v2-text, .container__left .game-object-question-extend-v2-text, .game-object-question-extend-v2-text, .passage-content, .reading-passage"
}

def clean_answer_prefix(text):
    """Strip standard answer prefixes like 'A. ', '(B) ', 'C: '."""
    if not text:
        return ""
    cleaned = re.sub(r'^[A-D][\.\:\-\s\)]+', '', text)
    return cleaned.strip()

def get_question_button(page, num):
    """Find the palette button for the given question number using robust selectors."""
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

def get_group_question_index(q_num, part, page):
    """Calculate the index of the question within its active group container."""
    if part == 3:
        return (q_num - 32) % 3
    if part == 4:
        return (q_num - 71) % 3
    if part == 6:
        return (q_num - 131) % 4
    if part == 7:
        try:
            passage_loc = page.locator(SELECTORS["passageContainer"]).first
            if passage_loc.count() > 0:
                text = passage_loc.inner_text().strip()
                for match in re.finditer(r'\b(\d+)\s*-\s*(\d+)\b', text):
                    start = int(match.group(1))
                    end = int(match.group(2))
                    if start <= q_num <= end:
                        return q_num - start
        except Exception:
            pass
    return 0


def save_checkpoint(url_slug, title, questions):
    """Write current progress to the checkpoint file."""
    data = {
        "title": title,
        "questions": questions
    }
    checkpoint_file = get_checkpoint_path(url_slug)
    with open(checkpoint_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    print("=========================================================")
    print("🚀 NGOAINGU24H TOEIC EXAM CRAWLER")
    print("=========================================================")

    # Parse CLI Arguments
    target_url = ""
    headless_mode = False
    
    limit_val = 200
    for arg in sys.argv[1:]:
        if arg == "--headless":
            headless_mode = True
        elif arg.startswith("--limit="):
            try:
                limit_val = int(arg.split("=")[1])
                print(f"Option: Crawl limit set to {limit_val} questions.")
            except ValueError:
                pass
        elif arg.startswith("http"):
            target_url = arg

    # 1. Ask for target URL if interactive and not provided
    if not target_url:
        if sys.stdin.isatty() and not headless_mode:
            target_url = input("Enter exam page URL (press ENTER to open browser and do it manually): ").strip()
        else:
            print("❌ Error: No URL provided in non-interactive environment.")
            sys.exit(1)

    # 2. Launch browser with persistent user data context
    print(f"📂 Storing browser profile in: {USER_DATA_DIR}")
    
    captured_audios = {} # Map containing captured audio URLs
    current_audio_url = None
    
    with sync_playwright() as p:
        print(f"Launching chromium (headless={headless_mode}) with profile: {USER_DATA_DIR}")
        context = p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=headless_mode,
            viewport={"width": 1280, "height": 800} if headless_mode else None,
            args=["--disable-blink-features=AutomationControlled"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        
        # Audio interception via network response
        def handle_response(response):
            nonlocal current_audio_url
            try:
                url = response.url
                content_type = response.headers.get("content-type", "").lower()
                if "audio" in content_type or any(ext in url.lower() for ext in [".mp3", ".wav", ".ogg", ".m4a"]):
                    if "message-bell" not in url:
                        current_audio_url = url
            except Exception:
                pass
        page.on("response", handle_response)
        
        if target_url:
            print(f"Navigating directly to: {target_url}")
            page.goto(target_url)
            print("Waiting 6 seconds for page to load...")
            time.sleep(6.0)
        else:
            page.goto("https://ngoaingu24h.vn")
            print("\n👉 ACTION REQUIRED:")
            print("1. Log in to your ngoaingu24h.vn account on the opened browser.")
            print("2. Open the review / landing page of the exam you want to crawl.")
            print("3. Once the page is loaded, return here and press [ENTER] to start crawling.")
            input("\nPress [ENTER] to start...")

        # Ensure we are in the review view (Xem lại bài làm)
        btn_review = page.locator("text=Xem lại bài làm").first
        if btn_review.count() > 0 and btn_review.is_visible():
            print("👉 Found 'Xem lại bài làm' button. Clicking it to enter review view...")
            btn_review.click()
            print("Waiting 5 seconds for review page to load...")
            time.sleep(5.0)
        else:
            # Check if "Làm bài" or "Tiếp tục" is visible
            btn_start = page.locator("button >> text=/^\\s*(Làm bài|Tiếp tục)\\s*$/").first
            if btn_start.count() > 0 and btn_start.is_visible():
                print(f"👉 Test not submitted yet. Clicking start/resume button: '{btn_start.inner_text().strip()}'")
                btn_start.click()
                time.sleep(4.0)
                
                # Check for audio modal
                btn_audio = page.locator("button >> text=/^\\s*Âm thanh tốt, bắt đầu ngay!\\s*$/").first
                if btn_audio.count() > 0 and btn_audio.is_visible():
                    print("Clicking audio confirmation 'Âm thanh tốt, bắt đầu ngay!'...")
                    btn_audio.click()
                    time.sleep(5.0)
                
                # Answer one question to enable the Submit button
                choices = page.locator(".quiz-choice-item, .answer-item, .choice-item, .game-object-question-extend-v2-choices-choice")
                if choices.count() > 0:
                    print("Selecting first choice of Question 1 to enable submission...")
                    choices.first.click()
                    time.sleep(3.0)
                
                # Click Submit
                btn_submit = page.locator("button >> text=/^\\s*Submit\\s*$/").first
                if btn_submit.count() > 0:
                    is_disabled = btn_submit.evaluate("el => el.disabled")
                    if is_disabled:
                        print("⚠️ Submit button is still disabled! Waiting 2 seconds...")
                        time.sleep(2.0)
                        is_disabled = btn_submit.evaluate("el => el.disabled")
                    
                    if not is_disabled:
                        print("Clicking 'Submit' button...")
                        btn_submit.click()
                        time.sleep(3.0)
                        
                        # Click Nộp bài
                        btn_confirm = page.locator("button >> text=/^\\s*Nộp bài\\s*$/").first
                        if btn_confirm.count() > 0 and btn_confirm.is_visible():
                            print("Clicking 'Nộp bài' confirmation button...")
                            btn_confirm.click()
                            print("Waiting 10 seconds for submission completion...")
                            time.sleep(10.0)
                            
                            # Now click "Xem lại bài làm" which should appear on the result page
                            btn_review_post = page.locator("text=Xem lại bài làm").first
                            if btn_review_post.count() > 0 and btn_review_post.is_visible():
                                print("👉 Clicking 'Xem lại bài làm' to view solutions...")
                                btn_review_post.click()
                                time.sleep(5.0)
                            else:
                                print("⚠️ 'Xem lại bài làm' not found after submission!")
                        else:
                            print("⚠️ 'Nộp bài' confirmation button not found!")
                    else:
                        print("⚠️ Could not enable Submit button.")
                else:
                    print("⚠️ Submit button not found in exam interface.")
            else:
                print("⚠️ Neither 'Xem lại bài làm' nor start/resume buttons found. Proceeding with current page state.")
            
        # Update test title from the page title
        test_title = "TOEIC Full Test Crawled"
        try:
            title_el = page.locator("h1, .test-title, .title").first
            if title_el.count() > 0:
                test_title = title_el.inner_text().strip()
            else:
                test_title = page.title().split("-")[0].strip()
        except Exception:
            pass

        # Determine unique slug from the active URL
        active_url = page.url
        url_slug = "TOEIC_Full_Test"
        if "/bai-hoc/" in active_url:
            url_slug = active_url.split("/")[-1].split("?")[0]
            url_slug = re.sub(r"[^a-zA-Z0-9\-]", "_", url_slug)
        else:
            url_slug = re.sub(r"[^a-zA-Z0-9]", "_", test_title)

        # 3. Check if checkpoint exists for this url_slug
        scraped_questions = []
        start_q = 1
        checkpoint_file = get_checkpoint_path(url_slug)

        if os.path.exists(checkpoint_file):
            try:
                with open(checkpoint_file, "r", encoding="utf-8") as f:
                    checkpoint_data = json.load(f)
                    scraped_questions = checkpoint_data.get("questions", [])
                    test_title = checkpoint_data.get("title", test_title)
                    
                if len(scraped_questions) > 0:
                    print(f"📦 Found checkpoint with {len(scraped_questions)} questions scraped for '{url_slug}'.")
                    if sys.stdin.isatty() and not headless_mode:
                        resume = input("Do you want to resume from last checkpoint? (y/n): ").strip().lower()
                    else:
                        resume = 'y'
                    if resume == 'y':
                        start_q = len(scraped_questions) + 1
                        print(f"Resuming from Question {start_q}...")
                    else:
                        print("Starting fresh. Previous checkpoint will be overwritten.")
                        scraped_questions = []
            except Exception as e:
                print(f"⚠️ Error reading checkpoint: {e}. Starting fresh.")
                scraped_questions = []
            
        # Check if output file exists and can be loaded
        output_filename = f"{url_slug}_data.json"
        output_path = os.path.join(SCRIPT_DIR, output_filename)
        if os.path.exists(output_path) and len(scraped_questions) == 0:
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    output_data = json.load(f)
                    scraped_questions = output_data.get("questions", [])
                    test_title = output_data.get("title", test_title)
                print(f"📦 Found existing output JSON with {len(scraped_questions)} questions. Using as cache to fill missing/invalid questions.")
            except Exception as e:
                print(f"⚠️ Error reading existing output JSON: {e}")
            
        print(f"\n🎬 Starting crawl for: '{test_title}' (slug: {url_slug}) from Question {start_q} to {limit_val}...")

        total_questions = limit_val
        if sys.stdin.isatty() and not headless_mode:
            try:
                user_total = input(f"Enter number of questions to crawl (Default {limit_val}, or enter a number like 5 for dry-run testing): ").strip()
                if user_total:
                    total_questions = int(user_total)
            except Exception:
                pass

        scraped_cache = {}
        # Prepopulate cache from loaded scraped_questions
        for q in scraped_questions:
            scraped_cache[q["display_order"]] = q

        def get_sorted_questions():
            return [scraped_cache[k] for k in sorted(scraped_cache.keys())]

        # Extract the actual question numbers and their corresponding parts from the palette dynamically
        q_nums = list(range(1, 201))
        button_to_part = {}
        try:
            segments = page.locator(".question-segment-item").all()
            if segments:
                extracted_nums = []
                for seg in segments:
                    header_el = seg.locator(".question-segment-item-header").first
                    if header_el.count() > 0:
                        header_text = header_el.inner_text().strip()
                        match = re.search(r'Part\s*(\d+)', header_text, re.IGNORECASE)
                        if match:
                            part_num = int(match.group(1))
                            buttons = seg.locator("button").all()
                            for btn in buttons:
                                txt = btn.inner_text().strip()
                                if txt.isdigit():
                                    num = int(txt)
                                    extracted_nums.append(num)
                                    button_to_part[num] = part_num
                if extracted_nums:
                    q_nums = sorted(list(set(extracted_nums)))
                    print(f"📋 Extracted {len(q_nums)} question numbers from palette: {q_nums}")
                    print(f"📋 Loaded dynamic button part mapping. Mapped {len(button_to_part)} buttons.")
            else:
                # Fallback to simple button locator if segments not found
                palette_buttons = page.locator("button[id^='question-']").all()
                if palette_buttons:
                    extracted_nums = []
                    for btn in palette_buttons:
                        txt = btn.inner_text().strip()
                        if txt.isdigit():
                            extracted_nums.append(int(txt))
                    if extracted_nums:
                        q_nums = sorted(list(set(extracted_nums)))
                        print(f"📋 Extracted {len(q_nums)} question numbers from palette: {q_nums}")
        except Exception as e:
            print(f"⚠️ Warning: Could not extract palette question numbers and parts: {e}")

        # Find the starting index in q_nums list
        current_idx = 0
        for idx, num in enumerate(q_nums):
            if num >= start_q:
                current_idx = idx
                break

        while current_idx < len(q_nums):
            q_num = q_nums[current_idx]
            if q_num > total_questions:
                print(f"Reached limit of {total_questions} questions. Stopping.")
                break
            
            if q_num in scraped_cache:
                q_cached = scraped_cache[q_num]
                is_valid = True
                if not q_cached.get("answers"):
                    is_valid = False
                elif q_cached.get("part") in [5, 6, 7] and not q_cached.get("question_text") and not q_cached.get("image_url"):
                    is_valid = False
                elif q_cached.get("part") == 7 and not q_cached.get("passage_text") and not q_cached.get("image_url"):
                    is_valid = False
                    
                if is_valid:
                    print(f"✅ Q{q_num} already scraped (retrieved from cache).")
                    current_idx += 1
                    continue
                else:
                    print(f"🔄 Q{q_num} in cache is invalid or dummy. Re-crawling...")

            print(f"🔍 Crawling Question {q_num} (index {current_idx}/{len(q_nums)})...")

            # Reset audio URL tracker for new question
            current_audio_url = None

            # Standard TOEIC Part Mapping
            part = button_to_part.get(q_num)
            if part is None:
                part = 5
                if q_num <= 6:
                    part = 1
                elif q_num <= 31:
                    part = 2
                elif q_num <= 70:
                    part = 3
                elif q_num <= 100:
                    part = 4
                elif q_num <= 130:
                    part = 5
                elif q_num <= 146:
                    part = 6
                else:
                    part = 7
            
            # Click the question button in the palette
            btn = get_question_button(page, q_num)
            if btn:
                try:
                    btn.scroll_into_view_if_needed()
                    btn.click()
                except Exception as click_err:
                    print(f"⚠️ Warning: Could not click button for Q{q_num}: {click_err}")
                # Wait 1.0 to 1.5 seconds for group questions/passages to load
                time.sleep(random.uniform(1.0, 1.5))
            else:
                print(f"⚠️ Warning: Question button {q_num} not found. Skipping navigation click.")

            # Identify all visible question containers using JS leaf node selector to avoid parent/child overlaps
            js_code = """
            () => {
                const selectors = [".game-object-quiz-wrap", ".question-detail-container", ".quiz-item", ".game-object-container"];
                let elements = [];
                for (const sel of selectors) {
                    const found = Array.from(document.querySelectorAll(sel));
                    elements.push(...found);
                }
                
                // Keep unique elements
                elements = Array.from(new Set(elements));
                
                // Filter only visible elements
                elements = elements.filter(el => {
                    const rect = el.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
                });
                
                // Filter out elements that contain other elements in the list
                const leafElements = elements.filter(el1 => {
                    return !elements.some(el2 => el1 !== el2 && el1.contains(el2));
                });
                
                // Clear any old attributes
                document.querySelectorAll("[data-crawl-leaf-index]").forEach(el => {
                    el.removeAttribute("data-crawl-leaf-index");
                });
                
                // Mark the leaf elements
                leafElements.forEach((el, index) => {
                    el.setAttribute("data-crawl-leaf-index", index.toString());
                });
                
                return leafElements.length;
            }
            """
            try:
                num_containers = page.evaluate(js_code)
                visible_containers = [page.locator(f"[data-crawl-leaf-index='{i}']") for i in range(num_containers)]
            except Exception as e:
                print(f"⚠️ Error evaluating leaf containers JS: {e}")
                # Fallback to standard logic if JS fails
                visible_containers = [c for c in page.locator(SELECTORS["questionContainer"]).all() if c.is_visible()]
                num_containers = len(visible_containers)

            print(f"📋 Found {num_containers} visible question containers on page for Q{q_num}.")

            if num_containers == 0:
                visible_containers = [page.locator("body")]
                num_containers = 1

            # Determine actual number of questions in this group
            limit = num_containers
            if part in [1, 2, 5]:
                limit = 1
            elif part in [3, 4]:
                limit = min(num_containers, 3)
            elif part == 6:
                limit = min(num_containers, 4)
            elif part == 7:
                limit = min(num_containers, 5)

            # Extract passage text (Part 6 & 7) once for the group
            passage_text = None
            if part in [6, 7]:
                try:
                    passage_loc = page.locator(SELECTORS["passageContainer"]).first
                    if passage_loc.count() > 0:
                        passage_text = passage_loc.evaluate("el => el.innerHTML").strip()
                except Exception as e:
                    print(f"⚠️ Warning: Could not extract passage HTML: {e}")

            # Pre-capture audio if needed for listening parts
            group_audio_url = None
            if part in [3, 4] and current_audio_url:
                group_audio_url = current_audio_url

            scraped_group = []
            for i in range(limit):
                # Extract Actual Question Number from container text
                target_q_num = None
                try:
                    container = visible_containers[i]
                    container_text = container.inner_text().strip()
                    # Method 1: Find patterns like "Question 147" or "Câu 147"
                    match = re.search(r'(?:question|câu)\s*(\d+)', container_text, re.IGNORECASE)
                    if match:
                        target_q_num = int(match.group(1))
                    else:
                        # Method 2: Search for "X." at start of lines
                        match = re.search(r'(?:^|\n)\s*(\d+)\s*\.', container_text)
                        if match:
                            target_q_num = int(match.group(1))
                except Exception as e:
                    print(f"⚠️ Error extracting question number from container: {e}")

                # Verify if target_q_num is valid, otherwise fallback
                # Also check if it's within a reasonable window around the clicked question (q_num)
                # to prevent false matches from prices (e.g. $4.000) or other random numbers on the page.
                is_valid_target = True
                if target_q_num is None or target_q_num < 1 or target_q_num > 200:
                    is_valid_target = False
                elif abs(target_q_num - q_num) > 10:
                    print(f"⚠️ Warning: Extracted Q{target_q_num} is too far from current Q{q_num}. Rejecting as false match.")
                    is_valid_target = False

                if not is_valid_target:
                    fallback_idx = current_idx + i
                    if fallback_idx < len(q_nums):
                        target_q_num = q_nums[fallback_idx]
                    else:
                        target_q_num = q_num + i

                print(f"📌 Container {i+1} maps to actual Q{target_q_num}")

                if target_q_num > total_questions:
                    break
                
                # Check if this question target is already cached and valid
                if target_q_num in scraped_cache:
                    q_cached = scraped_cache[target_q_num]
                    is_valid = True
                    if not q_cached.get("answers"):
                        is_valid = False
                    elif q_cached.get("part") in [5, 6, 7] and not q_cached.get("question_text") and not q_cached.get("image_url"):
                        is_valid = False
                    elif q_cached.get("part") == 7 and not q_cached.get("passage_text") and not q_cached.get("image_url"):
                        is_valid = False
                        
                    if is_valid:
                        continue
                    else:
                        print(f"🔄 Overwriting invalid/dummy Q{target_q_num} in cache...")

                container = visible_containers[i]

                # Extract Question Text
                q_text = ""
                try:
                    q_text_loc = container.locator(SELECTORS["questionText"]).first
                    if q_text_loc.count() > 0:
                        q_text = q_text_loc.inner_text().strip()
                except Exception as e:
                    print(f"⚠️ Error parsing question text for Q{target_q_num}: {e}")

                # Extract Image URL
                image_url = None
                try:
                    img_loc = container.locator(SELECTORS["questionImage"]).first
                    if img_loc.count() > 0 and img_loc.is_visible():
                        src = img_loc.get_attribute("src")
                        if src:
                            image_url = src
                except Exception:
                    pass

                # Extract Audio URL
                audio_url = None
                if part in [1, 2, 3, 4]:
                    if group_audio_url:
                        audio_url = group_audio_url
                    elif current_audio_url:
                        audio_url = current_audio_url
                        group_audio_url = current_audio_url
                    
                    if not audio_url:
                        try:
                            audio_loc = container.locator("audio").first
                            if audio_loc.count() > 0:
                                audio_url = audio_loc.evaluate("el => el.src || el.currentSrc || (el.querySelector('source') ? el.querySelector('source').src : '')")
                            if not audio_url:
                                audio_loc = page.locator("audio").first
                                if audio_loc.count() > 0:
                                    audio_url = audio_loc.evaluate("el => el.src || el.currentSrc || (el.querySelector('source') ? el.querySelector('source').src : '')")
                        except Exception:
                            pass
                    
                    if not audio_url and part in [3, 4]:
                        last_q = scraped_cache.get(target_q_num - 1)
                        if last_q and last_q.get("part") == part:
                            audio_url = last_q.get("audio_url")

                # Extract Answers
                answers = []
                correct_idx = -1
                try:
                    ans_items = container.locator(SELECTORS["answerItems"]).all()
                    for a_idx, ans_el in enumerate(ans_items):
                        txt_loc = ans_el.locator(SELECTORS["answerText"]).first
                        raw_text = txt_loc.inner_text().strip() if txt_loc.count() > 0 else ans_el.inner_text().strip()
                        ans_text = clean_answer_prefix(raw_text)
                        
                        is_correct = False
                        if txt_loc.count() > 0:
                            cls = txt_loc.get_attribute("class") or ""
                            if any(k in cls for k in ["correct", "success", "is-correct"]):
                                is_correct = True
                        if not is_correct:
                            cls = ans_el.get_attribute("class") or ""
                            if any(k in cls for k in ["correct", "success", "is-correct"]):
                                is_correct = True
                        if not is_correct:
                            for c_cls in [".correct", ".is-correct", ".success"]:
                                if ans_el.locator(c_cls).count() > 0:
                                    is_correct = True
                                    break
                                    
                        if is_correct:
                            correct_idx = a_idx
                            
                        answers.append({
                            "answer_text": ans_text,
                            "is_correct": is_correct,
                            "display_order": a_idx
                        })
                except Exception as e:
                    print(f"⚠️ Error parsing answers for Q{target_q_num}: {e}")

                if len(answers) == 0:
                    print(f"⚠️ Warning: No choices parsed for Q{target_q_num}!")

                # Extract Explanation
                explanation = ""
                try:
                    exp_loc = container.locator(SELECTORS["explanationContainer"]).first
                    if exp_loc.count() > 0 and exp_loc.is_visible():
                        explanation = exp_loc.inner_text().strip()
                except Exception:
                    pass

                if correct_idx != -1 and correct_idx < len(answers):
                    answers[correct_idx]["explanation"] = explanation

                # Extract Transcript & Translation
                transcript = ""
                translation = ""
                try:
                    trans_loc = container.locator(SELECTORS["transcriptText"]).first
                    if trans_loc.count() > 0:
                        transcript = trans_loc.inner_text().strip()
                except Exception:
                    pass
                try:
                    transl_loc = container.locator(SELECTORS["translationText"]).first
                    if transl_loc.count() > 0:
                        translation = transl_loc.inner_text().strip()
                except Exception:
                    pass

                # Group ID generation logic
                group_id = None
                if part == 3:
                    group_id = f"group_audio_p3_{math.floor((target_q_num - 32) / 3)}"
                elif part == 4:
                    group_id = f"group_audio_p4_{math.floor((target_q_num - 71) / 3)}"
                elif part in [6, 7] and passage_text:
                    text_for_hash = re.sub(r'<[^>]*>', '', passage_text)
                    norm_passage = re.sub(r"[^a-zA-Zàáâãèéêìíòóôõùúăđĩũơưạ-ỹ\s]", "", text_for_hash.strip().lower())
                    norm_passage = re.sub(r"\s+", " ", norm_passage).strip()
                    passage_hash = hashlib.md5(norm_passage.encode("utf-8")).hexdigest()
                    group_id = f"group_passage_p{part}_{passage_hash}"

                q_data = {
                    "part": part,
                    "question_text": q_text,
                    "display_order": target_q_num,
                    "audio_url": audio_url,
                    "image_url": image_url,
                    "answers": answers,
                    "transcript": transcript or None,
                    "translation": translation or None,
                    "passage_text": passage_text or None,
                    "group_id": group_id
                }
                scraped_cache[target_q_num] = q_data
                scraped_group.append(q_data)
                print(f"✅ Scraped & cached Q{target_q_num}")

            # Rebuild scraped_questions from cache sorted by display_order
            scraped_questions = get_sorted_questions()

            # Save checkpoint state
            save_checkpoint(url_slug, test_title, scraped_questions)
            print(f"💾 Checkpoint saved. Cache size: {len(scraped_cache)}")

            # Advance loop by the number of containers evaluated in this group
            advance_count = limit if limit > 0 else 1
            current_idx += advance_count

        # 4. Save final output JSON
        output_filename = f"{url_slug}_data.json"
        output_path = os.path.join(SCRIPT_DIR, output_filename)
        
        # Extract audio URL of the test (usually the first listening audio)
        main_audio_url = None
        for q in scraped_questions:
            if q["part"] in [1, 2, 3, 4] and q["audio_url"]:
                main_audio_url = q["audio_url"]
                break
                
        final_payload = {
            "title": test_title,
            "audio_url": main_audio_url,
            "questions": scraped_questions
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(final_payload, f, indent=2, ensure_ascii=False)

        # Remove checkpoint after successful completion
        checkpoint_file = get_checkpoint_path(url_slug)
        if os.path.exists(checkpoint_file):
            os.remove(checkpoint_file)

        print("=========================================================")
        print("🎉 CRAWL COMPLETED SUCCESSFULLY!")
        print("=========================================================")
        print(f"📁 Output file saved to: {output_path}")
        print(f"📝 Total questions scraped: {len(scraped_questions)}")
        print(f"👉 You can now click 'Import JSON' in L-English Admin and paste the content of this file.")
        print("=========================================================")
        
        context.close()

if __name__ == "__main__":
    main()
