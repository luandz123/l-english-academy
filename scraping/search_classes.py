import re
from collections import Counter
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"

if not os.path.exists(html_path):
    print("page_source.html not found.")
    exit(1)

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Find all class attributes
classes = re.findall(r'class=["\']([^"\']+)["\']', html)
all_classes = []
for c in classes:
    all_classes.extend(c.split())

class_counts = Counter(all_classes)

print("--- TOP CLASS NAMES ---")
for cls, count in class_counts.most_common(100):
    if any(k in cls.lower() for k in ["quiz", "question", "ans", "choice", "explain", "explan", "trans", "audio", "player", "game"]):
        print(f"{cls}: {count}")

print("\n--- DETECTING IDS ---")
ids = re.findall(r'id=["\']([^"\']+)["\']', html)
for i in ids:
    print(f"ID: {i}")

print("\n--- SAMPLE SEGMENTS CONTAINING CLASS 'quiz' OR 'question' ---")
# Find some elements with quiz or question classes
for line in html.splitlines():
    if len(line) < 1000 and any(k in line.lower() for k in ["quiz-", "question-", "game-object-"]):
        print(line.strip()[:150])
