# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Commands

```bash
# Development
wrangler pages dev                           # Start local dev server (http://localhost:8788)
wrangler login                              # Authenticate with Cloudflare (first time only)

# Testing
npm test                                    # Run tests once (CI mode)
npm run test:watch                          # Watch mode during development
npm run test:coverage                       # Generate HTML coverage report

# Deployment
git push origin main                        # Cloudflare Pages auto-deploys instantly

# Cache busting (when you modify CSS/JS)
python scripts/bump-cache-unified.py --target=css --apply --commit
# Available targets: css, tokens, pill, auth, guardian, all

# Playlist management
python scripts/generate-playlists-unified.py --apply --commit
python scripts/workflow.py add-playlist --slug=my-list --title="My List"
```

---

## Architecture Overview

**Static Pages** (Cloudflare Pages)
- Root: `/` → `index.html`
- Playlists: `/playlist/{slug}/` → Auto-generated from JSON in `_playlist_data/`
- Locales: `/en/`, `/es/`, `/ru/`, `/ja/` → Content variants
- Creator pages: `/creator/{slug}/`, `/creators.html`, `/creators-taipei.html`

**API Layer** (Cloudflare Workers) — 32 endpoints
- Auth: `/api/auth/signup`, `/api/auth/signin` → JWT issued on success
- Profile: `/api/profile/me` → Fetch current user + tier reconciliation
- Tokens: `/api/tokens/grant` → **Single write path for all earned tokens**
- Comments: `/api/comments` → Create/read user comments
- All endpoints centralized validation via `functions/_lib/validate.js`

**Database** (D1 SQLite)
- `twerkhub-subscribers` → users, profiles, comments, rate_limits tables
- Bound as `env.DB` in Worker functions
- Binding: `database_id = "a9203ef0-3f9d-4a1d-bd44-4a9748504afd"` in `wrangler.toml`

**Storage** (R2)
- `twerkhub-avatars` bucket → User uploads
- Bound as `env.AVATARS` in Worker functions

**Service Worker** (`service-worker.js`)
- **MUST be network-first** for CSS/JS/images (not stale-while-revalidate)
- **MUST skip `/api/*`** entirely (caching 401 responses caused logouts)
- **Activate event MUST nuke caches** (guarantees fresh content after deploy)

---

## Critical Invariants — Read CRITICAL_INVARIANTS.md First

This codebase has production-critical rules documented in `CRITICAL_INVARIANTS.md`. 
These are NOT generic best practices — they're bugs that took hours to diagnose.
Key items:

1. **Tier thresholds** are hardcoded in 5 files and MUST stay in sync
2. **Founder identity** checked by email only — NEVER by localStorage role
3. **Service Worker** must be network-first (not stale-while-revalidate)
4. **clearToken()** MUST wipe ALL `alexia_*` prefixed localStorage keys
5. **Cache busters** (`?v=YYYYMMDD-label`) MUST be bumped on every JS/CSS change
6. **Guardian script** (`twk-guardian.js`) is the safety net — do NOT remove
7. **Toast DOM structure** MUST use `<div>` + `textContent` (not span + innerHTML)
8. **Thumbnails** fallback through 9 YouTube variants, numeric `0.jpg/1.jpg/2.jpg/3.jpg` are critical for restricted videos

---

## Cache Busting Workflow

When you modify any CSS or JS file:

1. **Identify the file** (e.g., `assets/theme.css` → target `css`)
2. **Run the unified buster:**
   ```bash
   python scripts/bump-cache-unified.py --target=css --apply --commit
   ```
3. **Push:** `git push origin main` → Cloudflare Pages redeploys instantly

The buster finds all HTML files and increments the version param in script/link tags:
- From: `<script src="/assets/theme.css?v=20260511-p1"></script>`
- To: `<script src="/assets/theme.css?v=20260518-p2"></script>`

Service Worker is network-first, so new URL = fresh fetch. But users need fresh HTML too — Cloudflare deploys instantly on push, so cache busting + push = guaranteed update.

---

## Token System Architecture

**Client-side token flow** (critical to understand):
1. User watches video, wins tokens → `twk-tokens-v3.js` increments `localBalance`
2. `syncGrantToServer()` POSTs to `/api/tokens/grant` with earned amount
3. Backend writes to D1, returns new `server_balance`
4. Next page load: `reconcileWithServer()` reads `/api/profile/me`, fixes drift within 5,000 tokens

**DO NOT** bypass `/api/tokens/grant` and write directly to D1. The reconciliation logic depends on this single write path.

---

## Input Validation & Rate Limiting

**Single source of truth:** `functions/_lib/validate.js`

All Worker endpoints must use it:
```javascript
import { validateObject } from '../_lib/validate.js';

try {
  validateObject(req_body, {
    email: 'email',
    password: 'password',
    username: 'username',
  });
} catch (err) {
  return json({ error: err.code, errors: err.errors }, 400);
}
```

**Available schemas:** email, password, username, comment, url, slug, jwt, positive_int, locale, boolean

**Rate limiting** via `functions/_lib/rate-limit.js`:
```javascript
import { checkRateLimit, tooManyRequests } from '../_lib/rate-limit.js';

const limit = await checkRateLimit(env, `comment:${user_id}`, 5, 1);
// Allow 1 comment per 5 seconds per user

if (!limit.allowed) {
  return tooManyRequests(limit);  // Returns 429
}
```

---

## Playlist Generation & Data Structure

**Data source:** `_playlist_data/my-list.json`

```json
{
  "slug": "my-list",
  "title": "Curated Picks",
  "description": "...",
  "og_image": "https://i.ytimg.com/vi/.../hqdefault.jpg",
  "canonical_url": "https://alexiatwerkgroup.com/my-list/",
  "hero_video_id": "VIDEO_ID",
  "videos": [
    {
      "title": "Video Title",
      "video_id": "abc123",
      "duration": "3:45",
      "thumbnail": "https://..."
    }
  ],
  "seo_content": "<p>Detailed SEO description...</p>"
}
```

**Generate workflow:**
```bash
python scripts/generate-playlists-unified.py --locale=en --apply --commit
# Or multi-locale: python scripts/generate-playlists-unified.py --apply --commit
# Or via workflow: python scripts/workflow.py add-playlist --slug=new-list --title="New List"
```

The generator creates:
- `/playlist/my-list/index.html` (English)
- `/es/playlist/my-list/index.html` (Spanish)
- `/ru/playlist/my-list/index.html` (Russian)
- etc.

---

## Testing Strategy

**Test framework:** Vitest (zero external dependencies for core tests)

**Test files** in `tests/`:
- `validation.test.js` — 80+ test cases for input validation
- `rate-limit.test.js` — 30+ cases for distributed rate limiting
- `auth.test.js` — JWT generation, password hashing, security edge cases

**Coverage targets:**
- Validation: 95%+
- Rate limiting: 90%+
- Auth: All security paths covered

**Run tests:**
```bash
npm test                    # Once (CI mode)
npm run test:watch         # Watch during development
npm run test:coverage      # HTML report in coverage/
```

To add a new test:
```javascript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should validate email correctly', () => {
    const result = validateEmail('test@example.com');
    expect(result).toBe(true);
  });
});
```

---

## Deployment & Cloudflare Pages

**Automatic deployment** (recommended):
```bash
git push origin main
# Cloudflare Pages detects push → builds → deploys to live URL in ~30 seconds
# No build script needed (static site)
```

**Manual deployment** (if needed):
```bash
wrangler pages publish                  # Deploy Pages
wrangler deploy                         # Deploy Workers (if functions/ changed)
```

**Build settings in Cloudflare Dashboard:**
- Framework: None
- Build output directory: ` ` (root)
- Build command: (leave empty)

**Environment variables** (set in Cloudflare Pages → Settings → Variables):
- `JWT_SECRET` — 48+ byte random string for JWT signing
- Other secrets can be set per-environment

---

## Localization & i18n Patterns

The site supports **English, Spanish, Russian, Japanese** via directory structure:
- `/en/` → English
- `/es/` → Spanish
- `/ru/` → Russian
- `/ja/` → Japanese

**Playlists auto-generate** for all locales:
```bash
python scripts/generate-playlists-unified.py --apply --commit
```

**Key files to sync across locales:**
- `index.html` (home page)
- `/playlist/` directory structure
- `/blog/` content pages
- `/creator/` pages

---

## Common Pitfalls & Gotchas

1. **Forgetting cache buster** → Users see stale JS/CSS
   - Every JS/CSS change MUST include: `python scripts/bump-cache-unified.py --target=css --apply --commit`

2. **Tier thresholds drifting** → Users see wrong tier in dashboard
   - Check CRITICAL_INVARIANTS.md: thresholds in 5 files MUST match

3. **Service Worker serving stale content** → Hard refresh doesn't help
   - Service Worker is network-first (not stale-while-revalidate)
   - Activate event nukes caches on every deploy
   - If still stuck: `wrangler pages dev --clear-caches`

4. **Founder identity leaked** → Next user gets founder perks
   - NEVER check `localStorage.alexia_role` for founder status
   - ALWAYS check `auth_v3.user.email === 'alexiatwerkoficial@gmail.com'`
   - clearToken() MUST wipe ALL `alexia_*` keys

5. **Console.log left in code** → Pre-commit validation blocks commit
   - Validation checks for `console.log(`, `debugger`, etc.
   - Remove before committing or use `git push --no-verify` (not recommended)

6. **UTF-8 BOM in HTML** → Git commit blocked by pre-commit hook
   - Validation checks for BOM bytes (`\xEF\xBB\xBF`)
   - Clean with: `python scripts/workflow.py validate --fix`

7. **Token balance drifting** → Reconciler only fixes up to ±5,000 tokens
   - If drift exceeds 5,000, manual D1 correction needed
   - Always use `/api/tokens/grant` for client-side earnings

---

## File Organization

```
.
├── index.html                           # Home page (English)
├── en/, es/, ru/, ja/                  # Locale directories
│   ├── index.html                      # Locale-specific home
│   ├── playlist/                       # Locale playlists
│   └── blog/                           # Locale blog posts
├── playlist/                            # English playlists (auto-generated)
├── creator/                            # Creator profile pages
├── assets/                             # CSS, JS, images
│   ├── *.css                           # Global styles
│   ├── twk-*.js                        # Token system, guardian, auth
│   ├── theme.css                       # Main stylesheet
│   └── service-worker.js               # SW (network-first for assets)
├── functions/                          # Cloudflare Workers
│   ├── api/                            # API endpoints (32 total)
│   │   ├── auth/                       # signup, signin
│   │   ├── profile/                    # /me
│   │   ├── tokens/                     # /grant
│   │   └── comments/                   # CRUD
│   ├── _lib/                           # Shared libraries
│   │   ├── validate.js                 # Input validation (single source of truth)
│   │   ├── rate-limit.js               # Distributed rate limiting
│   │   ├── auth.js                     # JWT, password hashing
│   │   ├── tier.js                     # Tier computation
│   │   ├── http.js                     # JSON response helpers
│   │   └── tokens.js                   # Token logic
│   └── _d1/                            # Database schemas
│       ├── schema-auth-tokens.sql      # Users, profiles, JWTs
│       └── rate-limits.sql             # Rate limit table
├── _playlist_data/                     # JSON data for playlists (source of truth)
├── scripts/                            # Python automation
│   ├── bump-cache-unified.py           # Unified cache buster (css, tokens, etc.)
│   ├── generate-playlists-unified.py   # Playlist HTML generator (multi-locale)
│   └── workflow.py                     # Master orchestrator (add-playlist, hotfix, validate)
├── tests/                              # Vitest suite
│   ├── validation.test.js
│   ├── rate-limit.test.js
│   └── auth.test.js
├── .archived_scripts/                  # Old scripts (do not use)
├── wrangler.toml                       # Cloudflare config (D1 binding, R2 bucket)
├── package.json                        # npm scripts, Vitest config
└── CRITICAL_INVARIANTS.md              # Production rules (READ THIS)
```

---

## Database Queries & Management

**Connect to D1:**
```bash
wrangler d1 execute twerkhub-subscribers --remote --interactive
```

**Common queries:**
```sql
-- Check user balance
SELECT username, balance FROM profiles WHERE user_id = 'uid';

-- View recent comments
SELECT user_id, text, created_at FROM comments ORDER BY created_at DESC LIMIT 10;

-- Clean up old rate limits (monthly task)
DELETE FROM rate_limits WHERE window_start < datetime('now', '-7 days');

-- Backup database
wrangler d1 execute twerkhub-subscribers --remote ".dump" > backup.sql
```

---

## Troubleshooting Checklist

**Pages not updating after push?**
1. Check git status: `git log --oneline | head -3`
2. Check Cloudflare Pages → Deployments → Is latest build "Success"?
3. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
4. Clear service worker: `wrangler pages dev --clear-caches`

**Tests failing?**
1. Ensure Vitest installed: `npm install`
2. Run specific test: `npm test -- tests/validation.test.js`
3. Verbose output: `npm test -- --reporter=verbose`

**Auth not working?**
1. Check JWT_SECRET is set in Cloudflare dashboard
2. Verify D1 binding in wrangler.toml (database_id)
3. Test endpoint: `curl -X POST http://localhost:8788/api/auth/signup -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password123"}'`

**Token balance wrong?**
1. Check `/api/profile/me` returns correct balance
2. Run reconciliation: hard refresh page
3. If drift > 5,000, manually query D1 and fix balance

---

## Performance Notes

- **HTML:** Network-first (cache bypassed with Cloudflare Deploy)
- **CSS/JS:** Cached indefinitely with version bumper (`?v=YYYYMMDD-p1`)
- **Images:** Lazy-loaded with 9 YouTube thumbnail variants (handles restricted videos)
- **API:** Rate-limited to prevent abuse; watch for 429 responses

**Lighthouse targets:** 95+ Performance, 92+ Accessibility, 98+ SEO

---

**Last updated:** 2026-05-18  
**Version:** 1.0.0 (Production)
