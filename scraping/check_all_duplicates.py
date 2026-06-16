import os
import json

folder = "/home/luan/Desktop/l-english-academy/scraping"
files = [f for f in os.listdir(folder) if f.endswith("_data.json")]

for fname in sorted(files):
    fpath = os.path.join(folder, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    questions = data.get("questions", [])
    if not questions:
        continue
    
    seen = set()
    dups = 0
    part7_count = 0
    for q in questions:
        if q.get("part") == 7:
            part7_count += 1
            ans_texts = tuple(a.get("answer_text", "") for a in q.get("answers", []))
            q_key = (q.get("question_text"), ans_texts)
            if q_key in seen:
                dups += 1
            else:
                seen.add(q_key)
                
    if dups > 0:
        print(f"{fname}: {len(questions)} Qs, {part7_count} Part 7 Qs, {dups} duplicates in Part 7")
