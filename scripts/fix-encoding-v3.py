import glob
EMO = {
    "\u00f0\u0178\u2019\u00a5": "\U0001f4a5",
    "\u00f0\u0178\u2019\u017d": "\U0001f48e",
    "\u00f0\u0178\u017d\u0081": "\U0001f381",
    "\u00f0\u0178\u017d\u00ac": "\U0001f3ac",
    "\u00f0\u0178\u201c'": "\U0001f512",
    "\u00f0\u0178\u00a4\u2013": "\U0001f916",
    "\u00f0\u0178\u00aa\u2122": "\U0001fa99",
    "\u00f0\u0178\u201c^": "\U0001f50a",
    "\u00f0\u0178\u201c\u2122": "\U0001f4d4",
    "\u00f0\u0178\u2019\u017e": "\U0001f44e",
    "\u00f0\u0178\u2019\u017d": "\U0001f44d",
    "\u00f0\u0178\u017d\u00b5": "\U0001f3b5",
    "\u00f0\u0178\u017d\u00a8": "\U0001f3a8",
    "\u00f0\u0178\u017d\u00bc": "\U0001f3bc",
    "\u00f0\u0178\u00aa\u00a9": "\U0001fa99",
    "\u00f0\u0178'\u00a5": "\U0001f4a5",
    "\u00e2\u20ac\u201d": "\u2014",
    "\u00e2\u20ac\u02dc": "\u2018",
    "\u00e2\u20ac\u2122": "\u2019",
    "\u00e2\u20ac\u0153": "\u201c",
    "\u00e2\u20ac\u009d": "\u201d",
    "\u00e2\u20ac\u00a6": "\u2026",
    "\u00e2\u20ac\u00a2": "\u2022",
    "\u00e2\u20ac\u201c": "\u2013",
    "\u00e2\u2020'": "\u2192",
    "\u00e2\u2020\u20ac": "\u2190",
    "\u00e2\u2014": "\u25cf",
    "\u00e2\u02dc\u2026": "\u2605",
    "\u00e2\u02dc\u2020": "\u2606",
    "\u00e2\u017c\u2013": "\u2713",
    "\u00e2\u0161\u00a1": "\u26a1",
    "\u00c2\u00b7": "\u00b7",
    "\u00c2\u00a0": "\u00a0",
    "\u00c3\u00a9": "\u00e9",
    "\u00c3\u00a1": "\u00e1",
    "\u00c3\u00ad": "\u00ed",
    "\u00c3\u00b3": "\u00f3",
    "\u00c3\u00ba": "\u00fa",
    "\u00c3\u00b1": "\u00f1",
    "\u00c3\u0089": "\u00c9",
    "\u00c3\u0081": "\u00c1",
    "\u00c3\u0091": "\u00d1",
    "\u00c3\u0090\u0178": "\U0001f50a",
    "\u00c3\u2020'": "\u2192",
    "\u00c3\u00a2\u20ac\u201d": "\u2014",
    "\u00c2\u00bb": "\u00bb",
    "\u00c2\u00ab": "\u00ab",
}
def fix(t):
    # Try cp1252 round-trip first
    try:
        f = t.encode("cp1252", "strict").decode("utf-8", "strict")
        for k in ("\u00f0\u0178", "\u00e2\u20ac", "\u00e2\u2020", "\u00c2\u00b7"):
            if k in f: break
        else:
            return f
    except Exception: pass
    # Try latin-1 round-trip
    try:
        f = t.encode("latin-1", "strict").decode("utf-8", "strict")
        for k in ("\u00f0\u0178", "\u00e2\u20ac", "\u00e2\u2020", "\u00c2\u00b7"):
            if k in f: break
        else:
            return f
    except Exception: pass
    # Targeted replacements as last resort
    for bad, good in EMO.items():
        t = t.replace(bad, good)
    return t
def has_burnt(t):
    return ("\u00f0\u0178" in t or "\u00e2\u20ac" in t or "\u00e2\u2020" in t or "\u00c2\u00b7" in t or "\u00c3\u00a9" in t or "\u00e2\u2014" in t)
fc = 0
total_files = 0
for path in glob.glob("**/*.html", recursive=True) + glob.glob("**/*.css", recursive=True) + glob.glob("**/*.js", recursive=True):
    if ".git" in path or "_backups" in path or "node_modules" in path: continue
    try:
        with open(path, "r", encoding="utf-8") as fh: c = fh.read()
    except Exception: continue
    total_files += 1
    if not has_burnt(c): continue
    n = fix(c)
    if n != c:
        with open(path, "w", encoding="utf-8", newline="") as fh: fh.write(n)
        fc += 1
        print("FIXED:", path)
print()
print("=== SUMMARY ===")
print("  Scanned:", total_files, "files")
print("  Fixed:  ", fc, "files")
