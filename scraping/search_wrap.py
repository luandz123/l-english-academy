import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Find game-object-quiz-wrap and print 100 characters around it
for m in re.finditer(r'game-object-quiz-wrap', html):
    start = max(0, m.start() - 100)
    end = min(len(html), m.end() + 200)
    print("MATCH:", html[start:end])
