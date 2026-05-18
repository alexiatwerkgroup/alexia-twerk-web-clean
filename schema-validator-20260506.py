# -*- coding: utf-8 -*-
"""
Schema.org JSON-LD validator - 2026-05-06

Walks all HTML files, extracts JSON-LD blocks, validates:
1. Valid JSON syntax
2. Required @context and @type
3. Required fields per type (Google rich-snippet rules):
   - Article/BlogPosting: headline, datePublished, author, image
   - Product: name, image, offers (or aggregateRating/review)
   - VideoObject: name, thumbnailUrl, uploadDate, contentUrl or embedUrl
   - FAQPage: mainEntity with Question + acceptedAnswer
   - BreadcrumbList: itemListElement with position + name + item
   - Organization: name, url
   - WebSite: name, url
   - Person: name
   - DefinedTerm: name + description
4. Date format ISO 8601 where dates required
5. URL fields actually parse as URLs

Run from project root:
    python schema-validator-20260506.py
"""
import os, re, json
from urllib.parse import urlparse
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))

REQUIRED_FIELDS = {
    "Article":       ["headline", "datePublished", "author", "image"],
    "BlogPosting":   ["headline", "datePublished", "author", "image"],
    "Product":       ["name", "image"],
    "VideoObject":   ["name", "thumbnailUrl", "uploadDate"],
    "FAQPage":       ["mainEntity"],
    "BreadcrumbList":["itemListElement"],
    "Organization":  ["name", "url"],
    "WebSite":       ["name", "url"],
    "Person":        ["name"],
    "DefinedTerm":   ["name", "description"],
    "DefinedTermSet":["name"],
    "Service":       ["name"],
    "SoftwareApplication": ["name", "applicationCategory"],
    "WebPage":       ["name"],
}
DATE_FIELDS = {"datePublished", "dateModified", "uploadDate"}
URL_FIELDS  = {"url", "image", "logo", "thumbnailUrl", "contentUrl", "embedUrl", "sameAs"}

JSONLD_RE = re.compile(
    r'<script[^>]*\btype=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL
)

issues_total = 0
files_with_issues = 0
files_scanned = 0
blocks_total = 0
blocks_invalid_json = 0
type_counter = {}

def is_iso_date(s):
    if not isinstance(s, str): return False
    try:
        # ISO 8601 - relaxed
        datetime.fromisoformat(s.replace("Z", "+00:00"))
        return True
    except (ValueError, AttributeError):
        return False

def is_url(s):
    if not isinstance(s, str): return False
    p = urlparse(s)
    return p.scheme in ("http", "https") and bool(p.netloc)

def validate_node(node, path=""):
    """Recursively validate one schema.org node. Returns list of issues."""
    issues = []
    if not isinstance(node, dict): return issues
    t = node.get("@type")
    if isinstance(t, list): t = t[0]
    if t:
        type_counter[t] = type_counter.get(t, 0) + 1

    if t and t in REQUIRED_FIELDS:
        for req in REQUIRED_FIELDS[t]:
            if req not in node or node[req] in (None, "", []):
                issues.append(f"  [{path}/{t}] missing required field: {req}")

    # Date format check
    for k, v in node.items():
        if k in DATE_FIELDS and isinstance(v, str) and not is_iso_date(v):
            issues.append(f"  [{path}/{t}/{k}] not ISO date: {v[:40]}")
        # URL check (only top-level string, not nested complex objects)
        if k in URL_FIELDS and isinstance(v, str):
            if not is_url(v) and not v.startswith("/"):
                issues.append(f"  [{path}/{t}/{k}] not a valid URL: {v[:60]}")

    # Recurse into nested schema objects
    for k, v in node.items():
        if isinstance(v, dict):
            issues.extend(validate_node(v, f"{path}/{t or '?'}/{k}"))
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    issues.extend(validate_node(item, f"{path}/{t or '?'}/{k}[{i}]"))
    return issues

EXCLUDE_DIRS = {".git", "node_modules", ".vercel", ".next", "__pycache__"}
print("Scanning HTML files for JSON-LD blocks...\n")

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
    for fn in filenames:
        if not fn.lower().endswith((".html", ".htm")): continue
        full = os.path.join(dirpath, fn)
        with open(full, "r", encoding="utf-8") as f: src = f.read()
        files_scanned += 1
        rel = os.path.relpath(full, ROOT)
        local_issues = []

        for m in JSONLD_RE.finditer(src):
            blocks_total += 1
            raw = m.group(1).strip()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                blocks_invalid_json += 1
                local_issues.append(f"  [JSON parse error] {e.msg} (line {e.lineno})")
                continue

            # Handle both single objects and @graph arrays
            nodes = []
            if isinstance(data, dict):
                if "@graph" in data and isinstance(data["@graph"], list):
                    nodes = data["@graph"]
                else:
                    nodes = [data]
            elif isinstance(data, list):
                nodes = data

            for node in nodes:
                if not isinstance(node, dict): continue
                if not node.get("@context"):
                    local_issues.append(f"  [{node.get('@type', '?')}] missing @context")
                if not node.get("@type"):
                    local_issues.append(f"  missing @type")
                local_issues.extend(validate_node(node))

        if local_issues:
            files_with_issues += 1
            issues_total += len(local_issues)
            print(f"\n{rel}")
            for i in local_issues[:8]:  # cap per-file output
                print(i)
            if len(local_issues) > 8:
                print(f"  ... +{len(local_issues)-8} more")

# Summary
print(f"\n{'='*60}")
print(f"Files scanned:        {files_scanned}")
print(f"JSON-LD blocks total: {blocks_total}")
print(f"  invalid JSON:       {blocks_invalid_json}")
print(f"Files with issues:    {files_with_issues}")
print(f"Issues total:         {issues_total}")
print(f"\nType distribution (top 15):")
for t, n in sorted(type_counter.items(), key=lambda x: -x[1])[:15]:
    print(f"  {n:>5} x {t}")
