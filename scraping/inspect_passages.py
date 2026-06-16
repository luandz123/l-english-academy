import json
import re

filepath = "/home/luan/Desktop/l-english-academy/scraping/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-01-5734880069550080_data.json"
with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

questions = data["questions"]
part7_questions = sorted([q for q in questions if q.get("part") == 7], key=lambda x: x.get("display_order", 0))

print("Passages in Part 7 in display order:")
last_p = None
for q in part7_questions:
    p = q.get("passage_text")
    if p != last_p:
        last_p = p
        if p:
            # find Questions XX-YY or similar
            match = re.search(r"Questions?\s*\d+[-–]\d+", p, re.IGNORECASE)
            header = match.group(0) if match else "No Questions header"
            print(f"Q{q.get('display_order')}: {header} | {p[:80].strip()}...")
        else:
            print(f"Q{q.get('display_order')}: None")
