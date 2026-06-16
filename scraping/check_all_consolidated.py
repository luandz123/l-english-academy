import os
import json

SCRIPT_DIR = "/home/luan/Desktop/l-english-academy/scraping"
files = [
    "bo-de-2022-consolidated.json",
    "bo-de-2023-consolidated.json",
    "bo-de-2024-consolidated.json",
    "bo-de-2025-consolidated.json",
    "bo-de-2026-consolidated.json",
    "bo-de-nang-cao-consolidated.json",
    "bo-de-thuc-te-consolidated.json"
]

for filename in files:
    path = os.path.join(SCRIPT_DIR, filename)
    if not os.path.exists(path):
        print(f"❌ {filename} does not exist!")
        continue
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        exams = data.get("exams", [])
        print(f"\n=========================================")
        print(f"📊 {filename} - {data.get('course_title')}")
        print(f"=========================================")
        print(f"Total exams: {len(exams)}")
        for idx, exam in enumerate(exams):
            title = exam.get("exam_title", "No Title")
            qs = exam.get("questions", [])
            p7_qs = [q for q in qs if q.get("part") == 7]
            empty_text_qs = [q for q in qs if not q.get("question_text") and not q.get("image_url")]
            p7_empty_passage = [q for q in p7_qs if not q.get("passage_text") and not q.get("image_url")]
            
            status = "✅ OK"
            if len(qs) != 200:
                status = f"❌ Bad Question Count ({len(qs)})"
            elif len(p7_qs) == 0:
                status = "❌ No Part 7 Questions"
            elif len(empty_text_qs) > 50: # Part 1 and Part 2 don't have text, but others should
                status = f"❌ Too many empty questions ({len(empty_text_qs)})"
            elif len(p7_empty_passage) > 0:
                status = f"❌ P7 missing passages/images for {len(p7_empty_passage)} questions"
                
            print(f"  - Exam {idx+1}: {title}")
            print(f"    Questions: {len(qs)}, Part 7 Questions: {len(p7_qs)}")
            print(f"    Empty Questions: {len(empty_text_qs)}")
            print(f"    Status: {status}")
    except Exception as e:
        print(f"❌ Error reading {filename}: {e}")
