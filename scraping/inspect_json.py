import json

filepath = "/home/luan/Desktop/l-english-academy/scraping/bo-de-2022-bo-de-thi-thu-sat-de-thi-toeic-that-de-so-02-6131440297181184_data.json"
with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

questions = data["questions"]
unique_questions = []
seen = set()

for q in questions:
    ans_texts = tuple(a.get("answer_text", "") for a in q.get("answers", []))
    q_key = (q.get("part"), q.get("question_text"), ans_texts)
    if q_key not in seen:
        seen.add(q_key)
        unique_questions.append(q)

print(f"Total questions in JSON: {len(questions)}")
print(f"Unique questions in JSON: {len(unique_questions)}")
