import os
import json
import subprocess
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CRAWLER_PATH = os.path.join(SCRIPT_DIR, "crawl_fulltests.py")
PYTHON_EXEC = os.path.join(SCRIPT_DIR, ".venv", "bin", "python3")
CONSOLIDATED_FILE = os.path.join(SCRIPT_DIR, "bo-de-2023-consolidated.json")

EXAMS_INFO = [
    {
        "num": 1,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6312161850687488",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-6312161850687488_data.json"
    },
    {
        "num": 2,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-02-6053572409032704",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-02-6053572409032704_data.json"
    },
    {
        "num": 3,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-03-5628359976419328",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-03-5628359976419328_data.json"
    },
    {
        "num": 4,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-04-6731657483649024",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-04-6731657483649024_data.json"
    },
    {
        "num": 5,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-05-6594442066657280",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-05-6594442066657280_data.json"
    },
    {
        "num": 6,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-06-4997111919673344",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-06-4997111919673344_data.json"
    },
    {
        "num": 7,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-07-5662714275823616",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-07-5662714275823616_data.json"
    },
    {
        "num": 8,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-08-6008294994870272",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-08-6008294994870272_data.json"
    },
    {
        "num": 9,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-09-6571194250690560",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-09-6571194250690560_data.json"
    },
    {
        "num": 10,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-10-6559412917370880",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-10-6559412917370880_data.json"
    },
    {
        "num": 11,
        "url": "https://ngoaingu24h.vn/bai-hoc/bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-11-5898597906251776",
        "file": "bo-de-2023-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-11-5898597906251776_data.json"
    }
]

def is_exam_complete(file_path):
    if not os.path.exists(file_path):
        return False
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        questions = data.get("questions", [])
        if len(questions) < 200:
            return False
        for q in questions[:10]:
            if not q.get("answers"):
                return False
        return True
    except Exception:
        return False

def sanitize_exam(exam):
    questions = exam.get("questions", [])
    if not questions:
        return
    
    p1_audios = [q.get("audio_url") for q in questions if q.get("part") == 1 and q.get("audio_url")]
    p2_audios = [q.get("audio_url") for q in questions if q.get("part") == 2 and q.get("audio_url")]
    
    fallback_p1 = p1_audios[0] if p1_audios else exam.get("audio_url")
    fallback_p2 = p2_audios[0] if p2_audios else fallback_p1
    
    group_audio_map = {}
    for q in questions:
        part = q.get("part") or q.get("part_number") or 5
        g_id = q.get("group_id")
        a_url = q.get("audio_url")
        if part in [3, 4] and g_id and a_url:
            group_audio_map[g_id] = a_url
            
    for idx, q in enumerate(questions):
        part = q.get("part") or q.get("part_number") or 5
        if part in [1, 2, 3, 4] and not q.get("audio_url"):
            filled = False
            for next_q in questions[idx:idx+20]:
                next_part = next_q.get("part") or next_q.get("part_number") or 5
                if next_part == part and next_q.get("audio_url"):
                    q["audio_url"] = next_q["audio_url"]
                    filled = True
                    break
            
            if not filled:
                if part == 1:
                    q["audio_url"] = fallback_p1
                elif part == 2:
                    q["audio_url"] = fallback_p2
                elif part in [3, 4]:
                    g_id = q.get("group_id")
                    if g_id and g_id in group_audio_map:
                        q["audio_url"] = group_audio_map[g_id]
                    else:
                        for prev_q in reversed(questions[:idx]):
                            prev_part = prev_q.get("part") or prev_q.get("part_number") or 5
                            if prev_part == part and prev_q.get("audio_url"):
                                q["audio_url"] = prev_q["audio_url"]
                                break
                                
    if not exam.get("audio_url") and fallback_p1:
        exam["audio_url"] = fallback_p1

def consolidate_files():
    print("\n📦 Consolidating 2023 exams into a single JSON file...")
    consolidated = {
        "course_title": "Bộ đề thi thử sát đề thi thật 2023",
        "exams": []
    }
    
    for info in EXAMS_INFO:
        file_path = os.path.join(SCRIPT_DIR, info["file"])
        if not os.path.exists(file_path):
            print(f"⚠️ Error: Missing file {info['file']}. Cannot consolidate.")
            continue
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                exam_data = json.load(f)
            
            consolidated_exam = {
                "exam_title": f"Bộ đề thi thử sát đề thi thật 2023 - Đề số {info['num']:02d}",
                "audio_url": exam_data.get("audio_url"),
                "questions": exam_data.get("questions", [])
            }
            
            sanitize_exam(consolidated_exam)
            consolidated["exams"].append(consolidated_exam)
            print(f"✅ Added {consolidated_exam['exam_title']} ({len(consolidated_exam['questions'])} questions)")
        except Exception as e:
            print(f"❌ Error reading {info['file']}: {e}")
            
    with open(CONSOLIDATED_FILE, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, indent=2, ensure_ascii=False)
    print(f"🎉 Consolidated file written to: {CONSOLIDATED_FILE}")

def main():
    print("=========================================================")
    print("🔍 Checking and running crawlers for incomplete 2023 exams...")
    print("=========================================================")
    
    for info in EXAMS_INFO:
        file_path = os.path.join(SCRIPT_DIR, info["file"])
        if is_exam_complete(file_path):
            print(f"✅ Đề số {info['num']:02d} is already COMPLETE. Skipping.")
        else:
            print(f"❌ Đề số {info['num']:02d} is INCOMPLETE or MISSING. Crawling now...")
            cmd = [PYTHON_EXEC, CRAWLER_PATH, "--headless", info["url"]]
            print(f"Running: {' '.join(cmd)}")
            subprocess.run(cmd)
            time.sleep(5)
            
    consolidate_files()

if __name__ == "__main__":
    main()
