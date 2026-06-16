import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source_q131.html"

if os.path.exists(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    # Extract title
    title_match = re.search(r'<title>([^<]+)</title>', html)
    title = title_match.group(1) if title_match else "No Title"
    print(f"Title: {title}")
    
    # Extract some text elements or page text
    texts = re.findall(r'>([^<]{10,200})<', html)
    print("\n--- SAMPLE TEXTS FOUND ---")
    for t in texts[:30]:
        t_clean = t.strip()
        if t_clean:
            print(f"Text: '{t_clean}'")
else:
    print("File not found")
