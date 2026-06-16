import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"

if not os.path.exists(html_path):
    print("page_source.html not found.")
    exit(1)

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Search for "Chọn đáp án" or "Ẩn Giải thích:" and dump the surrounding 2000 characters
for keyword in ["Chọn đáp án", "Ẩn Giải thích:"]:
    pos = html.find(keyword)
    if pos != -1:
        print(f"\n=== SURROUNDING CONTENT FOR '{keyword}' ===")
        start = max(0, pos - 500)
        end = min(len(html), pos + 1500)
        # Format the block to show clean lines
        snippet = html[start:end]
        # Replace long SVG paths or attributes to keep output clean
        snippet_clean = re.sub(r'd="[^"]{50,}"', 'd="..."', snippet)
        snippet_clean = re.sub(r'class="css-[^"]+"', 'class="css-..."', snippet_clean)
        snippet_clean = re.sub(r'style="[^"]{50,}"', 'style="..."', snippet_clean)
        print(snippet_clean)
    else:
        print(f"Keyword '{keyword}' not found in HTML.")
