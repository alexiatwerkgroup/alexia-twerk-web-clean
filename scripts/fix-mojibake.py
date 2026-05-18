import os, sys, glob

# Mojibake patterns vs correct UTF-8
COMMON_FIXES = {
    "\u00c2\u00b7": "\u00b7",        # · (middle dot)
    "\u00c2\u00a0": "\u00a0",        # nbsp
    "\u00c3\u00a9": "\u00e9",        # é
    "\u00c3\u00a1": "\u00e1",        # á
    "\u00c3\u00ad": "\u00ed",        # í
    "\u00c3\u00b3": "\u00f3",        # ó
    "\u00c3\u00ba": "\u00fa",        # ú
    "\u00c3\u00b1": "\u00f1",        # ñ
    "\u00c3\u0089": "\u00c9",        # É
    "\u00c3\u0081": "\u00c1",        # Á
    "\u00c3\u0091": "\u00d1",        # Ñ
    "\u00e2\u0080\u0094": "\u2014",  # em-dash —
    "\u00e2\u0080\u0093": "\u2013",  # en-dash –
    "\u00e2\u0080\u0099": "\u2019",  # right single quote '
    "\u00e2\u0080\u009c": "\u201c",  # left double quote "
    "\u00e2\u0080\u009d": "\u201d",  # right double quote "
    "\u00e2\u0080\u00a6": "\u2026",  # ellipsis ...
    "\u00e2\u0086\u0092": "\u2192",  # arrow ->
    "\u00e2\u0086\u0090": "\u2190",  # arrow <-
    "\u00e2\u0086\u0091": "\u2191",  # arrow up
    "\u00e2\u0086\u0093": "\u2193",  # arrow down
    "\u00e2\u0080\u00a2": "\u2022",  # bullet
    "\u00e2\u0098\u2026": "\u2605",  # black star
    "\u00e2\u0098\u2020": "\u2606",  # white star
    "\u00e2\u009c\u2013": "\u2713",  # check mark
    "\u00e2\u0080\u0098": "\u2018",  # left single quote
    "\u00e2\u0080\u00a0": "\u2020",  # dagger
}

def fix_text(text):
    """Try direct latin1 -> utf8 round-trip first (handles most cases)."""
    try:
        fixed = text.encode("latin-1", errors="strict").decode("utf-8", errors="strict")
        return fixed
    except (UnicodeEncodeError, UnicodeDecodeError):
        # Fallback: targeted replacements
        for bad, good in COMMON_FIXES.items():
            text = text.replace(bad, good)
        return text

def has_mojibake(text):
    return ("\u00c2\u00b7" in text or "\u00c3\u00a9" in text or "\u00c3\u00a1" in text or
            "\u00e2\u0080\u0094" in text or "\u00e2\u0080\u0099" in text or "\u00e2\u0080\u009c" in text)

fixed_count = 0
skipped = 0
errors = 0
files = glob.glob("**/*.html", recursive=True) + glob.glob("**/*.css", recursive=True) + glob.glob("**/*.js", recursive=True)
for path in files:
    if ".git" in path or "node_modules" in path or "_backups" in path:
        continue
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        errors += 1
        continue
    if not has_mojibake(content):
        skipped += 1
        continue
    fixed = fix_text(content)
    if fixed != content:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(fixed)
        fixed_count += 1
        print("FIXED:", path)

print()
print("=== SUMMARY ===")
print("  Fixed:    ", fixed_count, "files")
print("  Skipped:  ", skipped, "files (clean)")
print("  Errors:   ", errors, "files")
