# CRITICAL INVARIANTS — DO NOT BREAK

> Last updated: 2026-05-11
> If you change anything in this file, REVIEW EVERY ITEM. Each one was a
> bug that took hours to diagnose and fix. Regressing any of them will
> almost certainly waste another full day.

---

## 1. Tier thresholds (canonical, frozen)

```
basic   : 0     – 2,999
medium  : 3,000 – 8,999
premium : 9,000 – 49,999
vip     : 50,000+
```

**Files that MUST agree on these numbers:**
- `assets/twk-tokens-v3.js` → `var TIERS = { medium: 3000, premium: 9000, vip: 50000 }`
- `assets/profile-stats-live.js` → `var TIERS = { medium: 3000, premium: 9000, vip: 50000 }`
- `account.html` → init() `TIERS` array
- `functions/_lib/tier.js` → `computeTier()` thresholds
- `assets/twk-guardian.js` → `INVARIANTS.TIERS`

**If you change one, change ALL.** Otherwise the dashboard, topbar, and
backend will report different tiers for the same balance.

---

## 2. Founder identity (single source of truth)

```
EMAIL : alexiatwerkoficial@gmail.com
USERNAME : Firestarter
FLOOR : 1,000,009 tokens (display minimum)
TIER : vip
REGISTERED : 2018-01-01
```

The founder is identified by **email only**, never by `localStorage.alexia_role`.
The role key was a security/UX bug — a logged-out founder left the role
in localStorage, and the next user who logged in inherited founder status
including 1M tokens. NEVER reintroduce role-based founder detection.

**Files that check founder:**
- `assets/twk-tokens-v3.js` → `isFounder()`
- `assets/profile-page.js` → `isFounder()`
- `account.html` → `isFounder` flag in init()
- `assets/twk-guardian.js` → `isFounder()`

All of these MUST check `FOUNDER_EMAILS` against `auth-v3.user.email` only.

---

## 3. Service Worker rules

**MUST be network-first** for static assets (CSS/JS/images). Stale-while-revalidate
WILL serve old cached JS forever and break every fix. See line ~93 of
`service-worker.js`.

**MUST skip `/api/*`** entirely. SW caching API responses caused random logouts
on hard refresh (cached 401 responses got served). See line ~62 of `service-worker.js`.

**Activate event MUST nuke caches.** This guarantees fresh content after deploy.
See line ~39 of `service-worker.js`.

---

## 4. clearToken (signOut) MUST wipe identity keys

`assets/supabase-config.js` `clearToken()` removes:
- `alexia-auth-v3`
- `alexia_role`
- `alexia_tokens_v1.*`
- `alexia_current_user`
- `alexia_forum_profile_v1`
- `alexia_age_verified_v1`
- ...and all `alexia_token*` prefixed keys

**Do NOT revert this to just removing auth-v3.** Otherwise founder identity
leaks to the next user who logs in.

---

## 5. Session boot does NOT auto-logout on transient failure

`assets/supabase-config.js` boot:
- 401 / 403 → `clearToken()` (server says invalid)
- Anything else (network error, 5xx, empty body) → KEEP the token,
  rebuild `currentSession` from localStorage.

Hard refresh + SW + network blip caused random logouts. Do NOT clearToken
on missing/empty body again.

---

## 6. Toast structure MUST use `<div>` + `textContent`

`assets/twerkhub-tokens.js` `showToast()` and `assets/twk-tokens-v3.js`
`toast()` build the toast with `document.createElement('div')` + `.textContent`,
NOT `<span>` + `innerHTML`. Spans collapsed inline as
`+3Video unlockedPreview · ABC123` even with the right CSS classes.

The CSS in `assets/twk-guardian.js` `injectArmorCSS()` ALSO forces the toast
to render correctly with `!important` rules — that's the safety net. Do not
remove it.

---

## 7. Thumbnails MUST eager-load + cascade through 9 variants

`assets/thumb-fallback.js` `FB` array:
```
['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default', '0', '1', '2', '3']
```

The numeric variants (`0/1/2/3.jpg`) are auto-generated keyframes that exist
for ANY public-but-restricted YouTube video. Without them, age-restricted
VR180 videos showed black thumbnails.

`markDead()` MUST be a no-op (or just add a class). The OLD behavior
(`img.src = DEAD_POSTER`, replace href with `javascript:void(0)`, open modal)
was a false-positive trap that made alive videos unclickable.

---

## 8. PowerShell HTML injection regex MUST NOT use plain `<head>`

The regex `(<head[^>]*>)` matches the literal text `<head>` inside CSS
comments like `/* loaded in <head> */`, leading to broken comment blocks
with kill scripts injected mid-comment. Always anchor on a unique structural
element (e.g., the existing `<script src="...sw-killer.js">` tag) when
inserting new content.

---

## 9. BOM in `_deleted/` files BLOCKS commits

Pre-commit hook checks all HTML files for UTF-8 BOM and blocks commits
on any match. The cleanup script in `_deleted/` files must run as part
of any large refactor:

```powershell
$NoBom = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem -Path $PWD -Recurse -Filter "*.html" | ForEach-Object {
  $bytes = [IO.File]::ReadAllBytes($_.FullName)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $text = [Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
    [IO.File]::WriteAllText($_.FullName, $text, $NoBom)
  }
}
```

---

## 10. D1 backend `/api/tokens/grant` is the single write path

Tokens earned client-side MUST sync via `POST /api/tokens/grant`.
`assets/twk-tokens-v3.js` `syncGrantToServer()` does this. The drift
reconciler (`reconcileWithServer()`) on every page load reads
`/api/profile/me` and reconciles local↔server to within 5,000 tokens.

Do NOT bypass `/api/tokens/grant` and write straight to D1 from elsewhere
without updating the reconciler logic.

---

## 11. Cache busters must be bumped on every change

Every JS file referenced from HTML uses `?v=YYYYMMDD-shortlabel` query
parameter. When you change a JS file, BUMP the cache buster across all HTMLs.
Use the canonical PowerShell pattern with `[regex]::Replace` and
`[IO.File]::WriteAllText` with `UTF8Encoding($false)` to avoid BOM.

The Service Worker is network-first, so a fresh URL = fresh fetch. But the
HTML file ITSELF needs to reach the user via fresh deploy. Cloudflare Pages
deploys instantly on `git push`, but if the user's browser has the OLD HTML
cached, they'll request the OLD JS URL.

---

## 12. Guardian script (`twk-guardian.js`) is the safety net

Loaded inline (or as the FIRST script) in every HTML. Self-tests on init,
re-runs at 500ms / 2s / 5s, watches for new images via MutationObserver.

If you're seeing weird behavior on a page, run `__twkGuardian.selfTest()`
in the console. It returns a report of every critical state.

DO NOT remove the guardian or any of its embedded `INVARIANTS`.

---

## 13. Toast + Sound work (verified 2026-05-11)

Toast and coin-cascade sound are fully functional in `assets/twk-tokens-v3.js`.
They're just fast (3.2s lifecycle). Do NOT change `playLoudPing()` or `toast()`
without testing on real page.

**2026-05-11 FIX:** Toast host (`#twk-toast-host-v3`) was NOT created on pages
with pre-built HUD in HTML (e.g., `/creators-taipei`). Root cause: `ensureHudElements()`
returned early if HUD existed, skipping toast-host creation. Fixed by moving
toast-host creation OUTSIDE the HUD existence check. Now always created.
