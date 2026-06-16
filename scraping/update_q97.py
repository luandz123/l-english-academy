import json

filepath = "de-thi-thuc-te-nua-dau-nam-2026-de-so-01-6688890497269760_data.json"
with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

updated = False
for q in data["questions"]:
    if q["display_order"] == 97:
        print("Before update:")
        print(q)
        for ans in q["answers"]:
            if ans["display_order"] == 0:
                ans["is_correct"] = True
                updated = True
            else:
                ans["is_correct"] = False
        print("After update:")
        print(q)

if updated:
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Successfully updated de-thi-thuc-te-nua-dau-nam-2026-de-so-01-6688890497269760_data.json")
else:
    print("Could not find display_order == 97 or choice display_order == 0")
