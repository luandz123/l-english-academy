import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source_q131.html"

if not os.path.exists(html_path):
    print("page_source_q131.html not found.")
    exit(1)

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

if "Riessler" not in html:
    print("Riessler is not in page_source_q131.html. Let's list some texts on the page to see if it's there.")
    # Check if there is "refer to the following"
    if "refer to the following" in html:
        print("Found 'refer to the following'")
    exit(1)

# Find the position of "Riessler"
pos = html.find("Riessler")
print("=== CONTEXT AROUND RIESSLER ===")
snippet = html[pos-800:pos+800]
snippet_clean = re.sub(r'd="[^"]{50,}"', 'd="..."', snippet)
snippet_clean = re.sub(r'class="css-[^"]+"', 'class="css-..."', snippet_clean)
snippet_clean = re.sub(r'style="[^"]{50,}"', 'style="..."', snippet_clean)
print(snippet_clean)

# Find the tag hierarchy of elements containing "Riessler"
# Let's do a regex search for <div ... > containing "Riessler"
# We can find all matches
print("\n=== TAG HIERARCHY ANALYSIS ===")
# Parse simple nested tags around the match
# Let's find tags on the left side of Riessler
left_side = html[:pos]
# Find open tags
open_tags = re.findall(r'<([a-zA-Z0-9\-]+)\s+[^>]*class=["\']([^"\']+)["\']', left_side[-3000:])
print("Recent tags before Riessler:")
seen = set()
for tag, cls in open_tags[-15:]:
    cleaned_cls = " ".join([c for c in cls.split() if "Mui" not in c and "css-" not in c])
    if cleaned_cls and cleaned_cls not in seen:
        print(f"<{tag} class=\"{cleaned_cls}\">")
        seen.add(cleaned_cls)
