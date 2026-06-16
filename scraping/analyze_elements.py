import re
import os

html_path = "/home/luan/Desktop/l-english-academy/scraping/page_source.html"

if not os.path.exists(html_path):
    print("page_source.html not found.")
    exit(1)

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

# Let's search for the block containing id="main-study-view-v2"
match = re.search(r'id=["\']main-study-view-v2["\'](.*)', html, re.DOTALL)
if not match:
    print("Could not find main-study-view-v2 in HTML")
    # Let's search for "main-game-view" or any main-study-view
    match = re.search(r'id=["\']main-game-view["\'](.*)', html, re.DOTALL)
    if not match:
        print("Could not find main-game-view either")
        exit(1)
    else:
        print("Found main-game-view")
else:
    print("Found main-study-view-v2")

content_section = match.group(1)

# Let's truncate content_section to make sure we don't parse the whole remainder if it's too big,
# but we want to see the hierarchy. Let's find all tags, classes, and texts in the first 50000 characters of this section.
sub_content = content_section[:100000]

print("--- TEXT SAMPLES IN MAIN STUDY VIEW ---")
# Find text inside tags
text_elements = re.findall(r'>([^<]{2,100})<', sub_content)
for t in text_elements[:30]:
    t_clean = t.strip()
    if t_clean:
        print(f"Text: '{t_clean}'")

print("\n--- TAGS AND CLASSES IN MAIN STUDY VIEW ---")
# Find all tags with classes in the first 50000 chars of main-study-view-v2
tag_class_matches = re.findall(r'<([a-zA-Z0-9]+)\s+[^>]*class=["\']([^"\']+)["\']', sub_content)
seen = set()
for tag, classes in tag_class_matches[:50]:
    cleaned_classes = " ".join([c for c in classes.split() if "Mui" not in c and "css-" not in c])
    if cleaned_classes:
        pair = (tag, cleaned_classes)
        if pair not in seen:
            print(f"<{tag} class=\"{cleaned_classes}\">")
            seen.add(pair)
