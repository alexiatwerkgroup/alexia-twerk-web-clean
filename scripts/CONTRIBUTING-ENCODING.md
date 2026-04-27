# Encoding rules — TWERKHUB

This repo is **strictly UTF-8 (no BOM)** with **LF line endings** for all source files. Mojibake (chars like `ðŸ"¥` instead of `🔥`) breaks SEO and UX. Don't ship it.

## Why this file exists

In April 2026, a PowerShell script wrote 758 HTML files using cp1252 (the Windows-1252 default), corrupting every emoji, smart quote, and arrow into double-encoded mojibake. Restoring took two cleanup commits. Never again.

## The 5 layers of defense

| Layer | File | What it does |
|-------|------|--------------|
| 1. Git EOL/charset | `.gitattributes` | Normalizes line endings + tags text files as UTF-8 |
| 2. Editor config | `.editorconfig` | Tells VSCode/Sublime/JetBrains/Notepad++ to write UTF-8 + LF |
| 3. Encoding scanner | `scripts/check-encoding.js` | Detects mojibake markers + BOM, exit code 1 if found |
| 4. Pre-commit hook | `scripts/setup-hooks.ps1` → `.git/hooks/pre-commit` | Blocks commits with mojibake. Run setup once after clone. |
| 5. Pre-deploy validator | `scripts/validate-pages.js` | Includes encoding check; runs before every deploy |

## Setup (run once after cloning)

```powershell
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean
powershell -ExecutionPolicy Bypass -File scripts\setup-hooks.ps1
```

That installs the pre-commit hook locally. The hook lives in `.git/hooks/` which is NOT committed (Git design), so each clone needs the setup script run once.

## Manual checks

```powershell
# Scan whole repo
node scripts/check-encoding.js

# Scan specific files
node scripts/check-encoding.js index.html blog/*.html
```

## The PowerShell rule (CRITICAL)

PowerShell on Windows defaults to **cp1252 (Windows-1252)** when writing files without explicit encoding. This is the root cause of every mojibake disaster in this repo. Always be explicit:

### ✓ DO

```powershell
# Modern PowerShell 7+
Set-Content -Path file.html -Value $content -Encoding UTF8NoBOM

# Universal (works in 5.1 and 7+)
[System.IO.File]::WriteAllText("$PWD\file.html", $content, (New-Object System.Text.UTF8Encoding $false))

# Reading is safer (PowerShell auto-detects), but be explicit anyway:
$content = Get-Content -Path file.html -Raw -Encoding UTF8
```

### ✗ DON'T

```powershell
# Default Out-File adds BOM AND uses cp1252-influenced encoding in PS 5.1
$content | Out-File file.html

# Set-Content without -Encoding uses cp1252 default in PS 5.1
Set-Content file.html $content

# Heredocs / here-strings written without explicit encoding
@'
text with emojis 🔥
'@ | Set-Content file.html
```

## The Python rule

Python 3 reads/writes UTF-8 by default on Linux/Mac but **uses cp1252 on Windows** unless you specify `encoding='utf-8'` explicitly.

### ✓ DO

```python
with open(path, 'r', encoding='utf-8') as f: content = f.read()
with open(path, 'w', encoding='utf-8', newline='') as f: f.write(content)
```

### ✗ DON'T

```python
with open(path, 'r') as f: content = f.read()  # may use cp1252 on Windows!
with open(path, 'w') as f: f.write(content)
```

## How to spot mojibake fast

These character sequences should NEVER appear in clean files:

```
ðŸ      → was an emoji (4-byte UTF-8)
â€      → was a smart quote / em-dash / en-dash
â†      → was an arrow
â—      → was a bullet
Â·      → was a middot
Ã©      → was é
Ã±      → was ñ
Ð       → was a cyrillic letter
```

If you see these, the file was double-encoded. Run:

```bash
node scripts/check-encoding.js
```

## How to fix existing mojibake

If a file already has mojibake, the fix is **cp1252 round-trip**:

```python
# Encode current text as cp1252 (recovers original bytes)
# Then decode as UTF-8 (correct interpretation)
fixed = broken_text.encode('cp1252', errors='strict').decode('utf-8', errors='strict')
```

In an emergency, restore from the most recent clean backup zip and run `scripts/check-encoding.js` to confirm.

## Legacy known-bad files (TODO: fix manually)

These 12 files contain cyrillic encoding corruption that pre-dates the encoding hardening (mix of cp866/cp1251/cp1252 in slugs and titles). They're whitelisted in `SKIP_FILES` so they don't break the validators, but they should be fixed by hand:

**Body content corruption** (medium priority):
- `group-emiliano-ferrari-villalobo.html`
- `group-monika-99-percent.html`
- `group-street-project-monika.html`

**Slug corruption** (low priority — slugs are internal IDs, not content shown to users):
- `playlist/turbo-pushka.html`
- `playlist/twerk--.html`
- `playlist/-twerk--10age.html`
- `playlist/-twerk-2.html`
- `playlist/-twerk-3.html`
- `playlist/-twerk-4.html`
- `playlist/-twerk.html`
- `playlist/aneli-team.html`
- `playlist/interaktivnoe-buti.html`
- `playlist/liuba-twerk.html`
- `playlist/sonia-twerk.html`

Suggested fix: replace `data-video-slug="..."` with the ASCII transliteration or remove the attribute. Then remove from `SKIP_FILES` in both `scripts/check-encoding.js` and `scripts/validate-pages.js`.

## Bypass (last resort)

If the pre-commit hook is wrong about your file (false positive):

```powershell
git commit --no-verify -m "your message"
```

But first: are you SURE? Check with `node scripts/check-encoding.js` — if it reports issues, fix them, don't bypass.
