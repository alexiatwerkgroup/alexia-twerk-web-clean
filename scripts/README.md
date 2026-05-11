# Scripts — Unified Automation Toolkit

All scripts are Python 3.8+. No external dependencies required.

---

## Quick Start

### 1. **Bump Cache** — Update asset versions

```bash
# Dry run (preview changes)
python scripts/bump-cache-unified.py --target=css --dry-run

# Apply changes
python scripts/bump-cache-unified.py --target=css --apply

# Apply + commit
python scripts/bump-cache-unified.py --target=css --apply --commit
```

**Available targets:**
- `css` — Global CSS/theme files
- `tokens` — Token system (twk-tokens-v3.js)
- `pill` — Token pill loader (twerkhub-pill-into-nav.js)
- `auth` — Auth module (twerkhub-auth.js)
- `guardian` — Safety net (twk-guardian.js)
- `all` — All assets (full bust)

**Custom version:**
```bash
python scripts/bump-cache-unified.py --target=tokens --version=20260511-p1 --apply
```

---

### 2. **Generate Playlists** — Create playlist HTMLs from JSON

```bash
# Dry run
python scripts/generate-playlists-unified.py --dry-run

# Generate for English
python scripts/generate-playlists-unified.py --apply

# Generate for Russian
python scripts/generate-playlists-unified.py --locale=ru --apply

# Generate + commit
python scripts/generate-playlists-unified.py --apply --commit
```

**Data structure** (`_playlist_data/my-list.json`):
```json
{
  "slug": "my-list",
  "title": "My Curated List",
  "description": "Best of the week...",
  "og_image": "https://...",
  "canonical_url": "https://alexiatwerkgroup.com/my-list/",
  "hero_video_id": "abc123",
  "videos": [
    {"title": "...", "video_id": "...", ...}
  ],
  "seo_content": "<p>Detailed description...</p>"
}
```

---

### 3. **Workflow Orchestrator** — Master control for complex tasks

#### Add Playlist Workflow

```bash
# 1. Create data file
cat > _playlist_data/new-list.json << EOF
{
  "slug": "new-list",
  "title": "New List 2026",
  "description": "Fresh picks",
  ...
}
EOF

# 2. Run workflow (generates HTML + bumps cache + commits)
python scripts/workflow.py add-playlist --slug=new-list --title="New List 2026"
```

#### Fix Component Workflow

```bash
# Fix tokens component (validates → bumps cache → commits)
python scripts/workflow.py fix-component --component=tokens --label=hotfix-v1
```

#### Deploy Hotfix

```bash
# Stage all changes + commit + (optionally push)
python scripts/workflow.py hotfix --message="fix: auth redirect loop" --push
```

#### Validate All

```bash
# Run full validation suite (BOM, CRLF, JSON syntax)
python scripts/workflow.py validate
```

---

## Use Cases

### Case 1: Update CSS theme globally

```bash
# 1. Update /assets/theme.css
# 2. Bump cache
python scripts/bump-cache-unified.py --target=css --apply --commit
# 3. Deploy automatically
git push origin main  # Cloudflare Pages auto-deploys
```

### Case 2: Publish new playlist

```bash
# 1. Create JSON data in _playlist_data/
# 2. Run workflow
python scripts/workflow.py add-playlist --slug=my-list --title="My List"
# Done! HTML generated + cache bumped + committed
```

### Case 3: Hotfix auth bug

```bash
# 1. Fix code in /assets/twerkhub-auth.js
# 2. Deploy hotfix
python scripts/workflow.py hotfix --message="fix: Google OAuth callback" --push
# 3. Cloudflare Pages deploys instantly
```

### Case 4: Bump only Token system

```bash
python scripts/bump-cache-unified.py --target=tokens --apply --commit
```

---

## File Structure

```
scripts/
├── README.md                          # This file
├── requirements.txt                   # Python dependencies
├── bump-cache-unified.py              # Cache buster (replaces 11 old scripts)
├── generate-playlists-unified.py      # Playlist generator (replaces 2 old scripts)
└── workflow.py                        # Master orchestrator
```

**Replaced scripts** (archived → `.archived_scripts/`):
- `bump-css-cache.py`
- `bump-d1-cache-v2.py`
- `bump-pill-cache.py`, `bump-pill-align-cache.py`
- `bump-token-cache-20260506.py`
- `bump-cb-p6.py`, `bump-cb-promo-v2.py`
- `bump-twerkhub-auth-cache.py`
- `generate_new_playlists.py`
- `generate_playlist_html.py`
- ... and 5 more

---

## Design Philosophy

**One source of truth:** Each class of task has ONE script, not 11 variations.

**Dry-run first:** All commands default to `--dry-run`. Preview changes before applying.

**Git-aware:** Auto-commit and push support. Respects `.gitignore`.

**Locale-aware:** Playlist generation handles multi-language (en/es/ru/ja).

**No dependencies:** Uses only Python stdlib. Fast, portable.

---

## Troubleshooting

### "No files changed"
Check that `bump-cache-unified.py` is scanning the right directory:
```bash
python scripts/bump-cache-unified.py --target=css --root=. --dry-run
```

### "Git commit failed"
Ensure git is configured:
```bash
git config --global user.email "dev@example.com"
git config --global user.name "Dev"
```

### "HTML not generating"
Check data file syntax:
```bash
python -m json.tool _playlist_data/my-list.json
```

---

## Next Steps

1. **Phase 2:** Input validation + rate limiting (see `functions/_lib/validate.js`)
2. **Phase 3:** Test suite with Vitest
3. **Phase 4:** Full documentation + executions tests
4. **Phase 5:** GitHub Actions CI/CD

---

**Version:** 20260511-unified  
**Maintained by:** Dev Team  
**Last updated:** 2026-05-11
