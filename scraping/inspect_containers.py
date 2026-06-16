from bs4 import BeautifulSoup
import os

filepath = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"
if os.path.exists(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    
    # Remove script/style
    for s in soup(["script", "style"]):
        s.decompose()
        
    texts = [t.strip() for t in soup.find_all(text=True) if t.strip()]
    print(f"Total text nodes: {len(texts)}")
    print("Sample text nodes (first 100):")
    for idx, t in enumerate(texts[:100]):
        print(f"{idx}: '{t}'")
else:
    print("page_source.html does not exist")
