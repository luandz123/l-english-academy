import os

filepath = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"
if os.path.exists(filepath):
    print("File size:", os.path.getsize(filepath))
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read(1000)
    print("Content preview:")
    print(content)
else:
    print("page_source.html does not exist")
