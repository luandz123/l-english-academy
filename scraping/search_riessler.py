import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"
if os.path.exists(html_path):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    if "Riessler" in html:
        print("YES! Riessler is in page_source.html")
        pos = html.find("Riessler")
        print(html[pos-300:pos+300])
    else:
        print("NO! Riessler is not in page_source.html")
else:
    print("page_source.html not found.")
