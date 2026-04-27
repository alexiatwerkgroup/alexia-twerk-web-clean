import glob
def has_burnt(t):
    return ('ðŸ' in t or 'â€' in t or 'â†' in t or 'â—' in t or 'â˜' in t or 'ÐŸ' in t or 'Ã†' in t)
def fix(t):
    try:
        f = t.encode('cp1252', 'strict').decode('utf-8', 'strict')
        if not has_burnt(f): return f
    except: pass
    try:
        f = t.encode('latin-1', 'strict').decode('utf-8', 'strict')
        if not has_burnt(f): return f
    except: pass
    return t
fc = 0
for path in glob.glob('**/*.html', recursive=True) + glob.glob('**/*.css', recursive=True) + glob.glob('**/*.js', recursive=True):
    if '.git' in path or '_backups' in path or 'node_modules' in path: continue
    try:
        with open(path, 'r', encoding='utf-8') as f: c = f.read()
    except: continue
    if not has_burnt(c): continue
    n = fix(c)
    if n != c:
        with open(path, 'w', encoding='utf-8', newline='') as f: f.write(n)
        fc += 1
        print('FIXED:', path)
print('Total fixed:', fc)