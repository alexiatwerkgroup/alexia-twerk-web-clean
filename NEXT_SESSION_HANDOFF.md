# Handoff for next session

Read this top to bottom before touching anything. It is the condensed
brain dump of the 2026-05-09 session.

---

## 1. Who you're working with

- **User:** Anti / Firestarter, founder of TWERKHUB at `alexiatwerkgroup.com`.
- **Account:** `alexiatwerkoficial@gmail.com` (founder), username `Firestarter`.
- **Test user:** Joncito (`twerkcarol@gmail.com`).
- **Style:** Direct, low patience, expects fast results. Will switch
  between Spanish and English mid-sentence. Will insult when frustrated.
  Do not match the tone. Stay professional, deliver the fix, push back
  when wrong but don't grovel.
- **Critical:** They cannot push code for you. They can ONLY paste
  PowerShell into their terminal. Every change you make must end with
  a one-shot PowerShell that bumps cache busters, commits, and pushes.

---

## 2. Project topology

```
C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean\
├── index.html                      # home portal
├── account.html                    # logged-in dashboard
├── profile.html                    # user profile page
├── recent.html, trending.html      # discovery pages
├── /assets/                        # JS, CSS, images
│   ├── twk-guardian.js             # ⚠️ first script on every page
│   ├── twk-tokens-v3.js            # token system (replaces token-system.js + twerkhub-tokens.js)
│   ├── thumb-fallback.js           # thumbnail recovery / cascade
│   ├── supabase-config.js          # D1 shim (despite the name)
│   ├── twerkhub-auth.js            # auth UI + flow
│   ├── twerkhub-tokens.js          # legacy HUD (still loaded, has emergency CSS injection)
│   ├── twk-auto-unlock-videos.js   # iframe + paywall overlay
│   ├── age-gate.js                 # 18+ modal
│   ├── twerkhub-email-capture.js   # email capture popup
│   ├── service-worker.js           # NOT in /assets, in root
│   └── ...
├── /functions/                     # Cloudflare Pages Functions (backend)
│   ├── /api/auth/*                 # signup, signin, session, signout, forgot, reset, google/*
│   ├── /api/profile/me             # GET/POST profile
│   ├── /api/tokens/grant           # atomic increment endpoint
│   ├── /api/avatar/upload          # R2 upload
│   ├── /avatars/[[path]].js        # R2 serve
│   └── /_lib/                      # auth.js, tier.js, http.js, tokens.js, resend.js
├── /_d1/                           # SQL schema files
├── service-worker.js               # PWA SW (network-first, skip /api/*)
├── _redirects                      # Cloudflare Pages redirects
├── wrangler.toml                   # Cloudflare config (D1 binding, R2 binding)
├── CRITICAL_INVARIANTS.md          # ⚠️ READ THIS FIRST
├── SESSION_2026_05_09.md           # what was fixed
├── EMERGENCY_PLAYBOOK.md           # recovery procedures
├── POWERSHELL_RECIPES.md           # canonical scripts
└── NEXT_SESSION_HANDOFF.md         # this file
```

---

## 3. Architecture

### Backend
- **Cloudflare Pages** hosts the static site.
- **Cloudflare Pages Functions** under `/functions/api/*` are the backend.
- **Cloudflare D1** (SQLite) is the database. Binding `DB` → `twerkhub-subscribers` (id `a9203ef0-3f9d-4a1d-bd44-4a9748504afd`).
- **Cloudflare R2** for avatar storage. Binding `AVATARS` → `twerkhub-avatars`.
- **Resend** for transactional email (password reset, email verification).
- Supabase is **DEAD** (paused). Don't try to revive.

### Auth flow
- `POST /api/auth/signup` → creates user + profile in D1, sets cookie + returns JWT.
- `POST /api/auth/signin` → accepts `{email, password}` OR `{username, password}`, returns JWT.
- `GET /api/auth/session` → validates JWT, returns user.
- JWT: HS256, secret in `JWT_SECRET` env var, stored in `alexia-auth-v3` localStorage AND `twk_jwt` HttpOnly cookie.
- Password hashing: PBKDF2 (100000 iter, SHA-256, 256-bit key, 16-byte salt).
  Format: `pbkdf2$<iter>$<salt_b64>$<hash_b64>`.

### Token economy
- Earned client-side (visit page, watch video, etc.), synced via `POST /api/tokens/grant`.
- Server is canonical. Drift reconciler runs on every page load and pushes local-only deltas (max 5000 catch-up).
- Tier ladder: basic 0-2999, medium 3000-8999, premium 9000-49999, vip 50000+.

### Founder override
- Email `alexiatwerkoficial@gmail.com` identifies the founder.
- Floor of 1,000,009 tokens displayed, but **accumulates on top** (`max(FLOOR, balance)`).
- Tier is always `vip`. Member since `2018-01-01`.
- D1 has Firestarter's row with `tokens=1000009, tier='vip'`. The frontend reapplies the floor on every page load via the guardian.

---

## 4. Critical files and their roles

### `assets/twk-guardian.js` (NEW, MUST stay)
First script on every page. Frozen constants, self-tests, auto-heals
thumbnails / founder state / auth coherence. Has `__twkGuardian.selfTest()`
for debugging.

### `assets/twk-tokens-v3.js` (NEW, replaces old token system)
Standalone token system. HUD, toast, grants, sync to D1, drift reconciler.
Each HTML references this AND the legacy `twerkhub-tokens.js` (for backward
compat with the badge/toast rendering — the legacy file also has its own
emergency CSS injection now).

### `assets/twerkhub-tokens.js` (LEGACY but active)
Old HUD + toast renderer. Updated this session to use divs + textContent
(was spans + innerHTML causing the inline collapse bug). Has
`injectEmergencyCSS()` that fires when the HUD builds.

### `assets/thumb-fallback.js`
9-variant cascade for YouTube thumbnails. `markDead()` is a no-op (the
old behavior of swapping to thumb-unavailable.svg + blocking clicks
was the source of many false positives).

### `assets/supabase-config.js` (D1 shim, name lies)
Provides `window.__twkSupabase` with auth API. Despite the file name,
this talks to D1 via `/api/*`. Boot session validation does NOT clear
token on transient failures (only on explicit 401/403).

### `service-worker.js`
PWA SW at v2.1.0. **NETWORK-FIRST** for static assets. **SKIPS `/api/*`**
entirely. Nukes caches on activate.

### `functions/_lib/tier.js`
Backend tier computation. Must match frontend thresholds 3000/9000/50000.

---

## 5. The "do not break these" list (full version in CRITICAL_INVARIANTS.md)

1. Tier thresholds 3000 / 9000 / 50000 in all 5 places.
2. Founder identified by email only, never by `localStorage.alexia_role`.
3. SW is network-first for static, skips /api/*.
4. clearToken wipes all identity localStorage keys.
5. Session boot does NOT logout on transient failure (only explicit 401/403).
6. Toast uses divs + textContent (NOT spans + innerHTML).
7. Thumbnail cascade includes 0/1/2/3.jpg variants.
8. PowerShell HTML injection never matches plain `<head>` regex (matches CSS comments).
9. BOM in `_deleted/` blocks commits — strip before any large refactor.
10. `/api/tokens/grant` is the single write path for token earnings.
11. Cache busters bumped on every change.
12. Guardian script (`twk-guardian.js`) loaded first on every page.

---

## 6. PowerShell gotchas (the source of 70% of our bugs)

### Always use this pattern for HTML edits:

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
$content = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
$new = [regex]::Replace($content, $pattern, $replacement)
[IO.File]::WriteAllText($path, $new, $NoBom)
```

- `[IO.File]::WriteAllText` with `UTF8Encoding($false)` writes **no BOM**.
- `Set-Content -Encoding UTF8` writes BOM by default in Windows PowerShell 5 (pre-commit hook blocks).
- `Get-Content | Set-Content` is fine for line ops but adds BOM same problem.

### Never match plain `<head>` with regex

The literal text `<head>` appears inside CSS comments like
`/* loaded in <head> */`. The regex `(<head[^>]*>)` matches BOTH the real
tag and the comment text. Use the existing kill-script as anchor:

```powershell
$anchorPattern = [regex]::new('(<script>\(function\(\)\{var F=''twk_killed_20260509_v2'';)')
$new = $anchorPattern.Replace($orig, "$newTag`r`n`$1", 1)
```

### Exclude `_deleted/` and `.bak` from all bulk operations

```powershell
Get-ChildItem -Path $Root -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object { ... }
```

### Cache-buster bump template

```powershell
$new = [regex]::Replace($orig, '<file>\.js\?v=[^"''\s>]+', '<file>.js?v=<new-version>')
```

---

## 7. D1 quick reference

```sql
-- Founder
UPDATE profiles SET tokens=1000009, total_earned=1000009, tier='vip'
WHERE email='alexiatwerkoficial@gmail.com';

-- Recompute tiers for all users
UPDATE profiles SET tier = CASE
  WHEN tokens >= 50000 THEN 'vip'
  WHEN tokens >= 9000  THEN 'premium'
  WHEN tokens >= 3000  THEN 'medium'
  ELSE 'basic'
END;
```

D1 database id: `a9203ef0-3f9d-4a1d-bd44-4a9748504afd`.
Account id: `520e96467a4a789f3b11c69de4112229`.

To query from a Cloudflare MCP tool:
```
mcp__e1d03eca-394e-4cbc-a2fd-13d596c6685c__d1_database_query
  database_id: a9203ef0-3f9d-4a1d-bd44-4a9748504afd
  sql: SELECT ...
```

---

## 8. Common deploy ritual

```powershell
cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$NoBom = New-Object System.Text.UTF8Encoding($false)
# Bump cache buster of <file>.js
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | Where-Object {
    $_.FullName -notmatch '\\_deleted\\' -and $_.FullName -notmatch '\.bak$'
} | ForEach-Object {
    $orig = [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8)
    if (-not $orig) { return }
    $new = [regex]::Replace($orig, '<file>\.js\?v=[^"''\s>]+', '<file>.js?v=<new-version>')
    if ($new -ne $orig) { [IO.File]::WriteAllText($_.FullName, $new, $NoBom) }
}
git add .
git commit -m "<message>"
git push
```

Cloudflare Pages deploys instantly on push. The user then has to wait
~60s before testing in incognito.

---

## 9. Debug helpers

In the browser console of any page:

```js
__twkGuardian.selfTest()
```

Returns:
```
{
  version: '1.0',
  uptime: <ms>,
  isFounder: <bool>,
  armorCSS: <bool>,           // emergency CSS present
  thumbsHijacked: <int>,      // imgs with thumb-unavailable.svg
  auth: { email, hasToken },
  balance: <int>,
  tier: <string>
}
```

If `armorCSS` is false or `thumbsHijacked > 0`, things are broken.

---

## 10. Known issues / pending work

- The legacy `twerkhub-tokens.js` is still loaded alongside `twk-tokens-v3.js`.
  Long-term: remove the legacy file once we confirm v3 covers all features.
- Some HTMLs still have OLD cache busters for files NOT in the bump rotation
  (e.g., `welcome-bonus.js`). These are not critical but leave a stale
  asset reference.
- The `_deleted/` folder still has BOM in files — they're excluded from
  bulk operations, but if you ever touch them, BOM-strip first.
- `enter-now-widget.js` had a syntax error at line 218 — commented out of
  `profile.html`. Whole file may be deletable.

---

## 11. If the user asks "why is X broken"

1. Run `__twkGuardian.selfTest()` in console.
2. Check `CRITICAL_INVARIANTS.md` — is X mentioned?
3. Check `SESSION_2026_05_09.md` — was X fixed today? If yes, the fix may
   have regressed. Check the relevant file's modification.
4. Check `_redirects` — is there a redirect that's not firing?
5. Check Cloudflare Pages deploy status — did the latest push deploy?

---

## 12. Communication best practices with this user

- Lead with the fix, not the explanation. They want results.
- Always end with a copy-pastable PowerShell. They will not type their own.
- After a fix, give one-line "after the deploy, do X" instructions.
- If you broke something, own it directly and fix it. No grovelling.
- If you don't have enough info, ASK with `AskUserQuestion` tool BEFORE
  touching anything. Wrong assumptions waste their time.
- If they're abusive, stay professional. Don't escalate, don't shrink.
