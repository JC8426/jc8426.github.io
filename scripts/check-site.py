"""Validate local navigation and assets for the static GitHub Pages site."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.links, self.images = set(), [], []
        self.errors = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                self.errors.append(f'duplicate id: {attrs["id"]}')
            self.ids.add(attrs["id"])
        for attr in ("href", "src", "poster", "data-image"):
            if attrs.get(attr):
                self.links.append(attrs[attr])
        if tag == "img" and "alt" not in attrs:
            self.errors.append("image missing alt text")
        for en, zh in (("data-en", "data-zh"), ("data-lang-en", "data-lang-zh")):
            if (en in attrs) != (zh in attrs):
                self.errors.append(f"incomplete translation: {attrs.get(en, attrs.get(zh))}")

pages = {name: Page((ROOT / name).read_text()) for name in ("index.html", "rcap-2026.html", "software-data.html")}
errors = []
for name, page in pages.items():
    errors.extend(f"{name}: {error}" for error in page.errors)
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = unquote(url.path) or name
        if not (ROOT / target).is_file():
            errors.append(f"{name}: missing local file {target}")
        if url.fragment and target in pages and url.fragment not in pages[target].ids:
            errors.append(f"{name}: missing anchor {link}")
if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(pages)} pages; local assets, anchors, image alternatives, and translation pairs.")
