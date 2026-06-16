import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

classes_found = set()
for m in re.finditer(r'class=["\']([^"\']+)["\']', html):
    for c in m.group(1).split():
        if any(k in c.lower() for k in ["read", "pass", "scroll", "split", "game", "panel", "wrap"]):
            classes_found.add(c)

print("--- CLASSES MATCHING KEYWORDS ---")
for c in sorted(classes_found):
    print(c)
