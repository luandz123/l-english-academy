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

def check_file(filename):
    path = os.path.join(SCRIPT_DIR, filename)
    if not os.path.exists(path):
        return f"❌ File missing"
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        return f"❌ Invalid JSON: {e}"
    
    course_title = data.get("course_title", "Unknown")
    exams = data.get("exams", [])
    
    if not exams:
        return f"❌ No exams found"
        
    exam_reports = []
    for idx, exam in enumerate(exams):
        title = exam.get("exam_title", "No Title")
        questions = exam.get("questions", [])
        
        # Check display_order continuity
        orders = sorted([q.get("display_order") for q in questions if q.get("display_order") is not None])
        gaps = []
        if orders:
            expected = list(range(1, len(orders) + 1))
            if orders != expected:
                # Find the gaps
                all_set = set(range(1, max(orders) + 1))
                gaps = sorted(list(all_set - set(orders)))
        
        # Check answers
        answers_missing = 0
        correct_missing = 0
        for q in questions:
            ans = q.get("answers", [])
            if not ans:
                answers_missing += 1
            else:
                has_correct = any(a.get("is_correct") for a in ans)
                if not has_correct:
                    correct_missing += 1
                    
        p7_qs = [q for q in questions if q.get("part") == 7]
        p7_missing_passage = [q for q in p7_qs if not q.get("passage_text") and not q.get("image_url")]
        
        status = "✅ OK"
        if len(questions) != 200:
            status = f"⚠️ Count = {len(questions)}"
        if gaps:
            status += f" (Gaps: {gaps[:5]}...)"
        if answers_missing > 0:
            status += f" (Missing answers: {answers_missing})"
        if correct_missing > 0:
            status += f" (No correct choice: {correct_missing})"
        if p7_missing_passage:
            status += f" (P7 missing passage: {len(p7_missing_passage)})"
            
        exam_reports.append({
            "title": title,
            "questions_count": len(questions),
            "status": status,
            "gaps": gaps
        })
        
    return {
        "course_title": course_title,
        "exams": exam_reports
    }

for filename in files:
    res = check_file(filename)
    if isinstance(res, str):
        print(f"\n=========================================\n📁 {filename}\n=========================================\n{res}")
    else:
        print(f"\n=========================================\n📁 {filename} - {res['course_title']}\n=========================================")
        for exam in res["exams"]:
            print(f"  - {exam['title']}: {exam['status']}")
