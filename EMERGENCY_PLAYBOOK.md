# Emergency playbook

When something breaks, find the symptom below and follow the procedure.

---

## Symptom: toast text concatenated into one line ("+3Video unlockedPreview · ABC123")

**Cause:** stale `twerkhub-tokens.js` cached in browser OR emergency CSS not present in HTML.

**Fix path:**
1. Open browser console on the broken page, run `__twkGuardian.selfTest()`.
2. If `armorCSS: false` → guardian not loaded. The HTML doesn't have
   `<script src="/assets/twk-guardian.js">` in head. Re-inject via
   `POWERSHELL_RECIPES.md` recipe "inject guardian into all HTMLs".
3. If `armorCSS: true` but toast still broken → bump `twk-tokens-v3.js`
   cache buster. The browser is loading stale JS.

---

## Symptom: thumbnails on /recent show black rectangles

**Cause:** lazy-loading not firing OR images hijacked to thumb-unavailable.svg.

**Fix path:**
1. Open console, run `__twkGuardian.selfTest()`.
2. If `thumbsHijacked > 0` → the OLD `thumb-fallback.js` is running.
   Bump its cache buster.
3. Inspect a black card's img element. Check `src`:
   - If it's `https://i.ytimg.com/vi/.../hqdefault.jpg` and the network
     request returns 120x90 placeholder → YouTube ID likely deleted.
   - If it's `https://i.ytimg.com/vi/.../0.jpg` → cascade already ran, image
     should be a valid keyframe. If still black, hard-refresh.
   - If it's `/assets/thumb-unavailable.svg` → guardian should have recovered
     it. Check `data-twk-orig-src` attribute.

---

## Symptom: dashboard shows 0 tokens / Basic tier for the founder

**Cause:** account.html init() not running, or founder check failing.

**Fix path:**
1. Console: `JSON.parse(localStorage.getItem('alexia-auth-v3')).user.email`
2. If email is NOT `alexiatwerkoficial@gmail.com` → not founder, expected behavior.
3. If email matches but dashboard still 0 → check for broken inline injection
   in account.html (search for `Nothing inline` or duplicate kill-script in CSS comments).
4. Run `__twkGuardian.selfTest()` to confirm balance state.

---

## Symptom: random logout on hard refresh

**Cause:** SW caching `/api/auth/session` 401 OR boot clearing token on transient failure.

**Fix path:**
1. Check `service-worker.js` — line ~62 must have:
   `if (url.pathname.indexOf('/api/') === 0) return;`
2. Check `assets/supabase-config.js` boot block — only clearToken on 401/403.
3. If SW is stale, bump version (line ~17 `const CACHE_NAME = 'alexia-pwa-v2.X.X';`).

---

## Symptom: pre-commit hook blocks every commit with BOM error

**Cause:** UTF-8 BOM in some HTML files (usually in `_deleted/`).

**Fix path:**
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

Bypass once if absolutely necessary: `git commit --no-verify` (last resort).

---

## Symptom: changes pushed but site doesn't show new content

**Cause:** Cloudflare Pages deploy didn't fire, or browser has stale HTML.

**Fix path:**
1. Check `https://dash.cloudflare.com/` → Pages → project → Deployments.
   Most recent should be < 2 min old and status "Success".
2. If no recent deploy → check `git log --oneline -3` locally and on GitHub.
   The commit must be on the `main` branch.
3. If deploy succeeded but browser shows old → user must close ALL Chrome
   windows (not just tab) to kill SW state, then reopen in incognito.

---

## Symptom: founder loses tokens / sees 0 / sees old balance

**Cause:** localStorage drift OR D1 has lower value.

**Fix path:**
1. Re-set D1 row directly:
```sql
UPDATE profiles SET tokens=1000009, total_earned=1000009, tier='vip'
WHERE email='alexiatwerkoficial@gmail.com';
```
2. Have founder log out and log in again (forces hard sync from D1).
3. Guardian's `enforceFounderFloor()` will reapply the local minimum on
   the next page load.

---

## Symptom: locked video page shows only paywall, no iframe behind

**Cause:** `twk-auto-unlock-videos.js` not loaded on that HTML.

**Fix path:**
1. The 5 affected files:
   - try-on-hot-leaks/will-you-help-her-choose-a-swimsuit-treadmill-swim-week.html
   - try-on-hot-leaks/vr180-3d-model-olena-tries-on-a-red-lingerie-sun-media.html
   - try-on-hot-leaks/four-sets-of-swimsuits-and-underwear-in-vr-fashion-room.html
   - korean-girls-kpop-twerk/throw-it-back-トゥワーク-みくり-miqri-twerk-choreo-miqri-twerk.html
   - korean-girls-kpop-twerk/throw-it-back-みくり-トゥワーク-レッスンmiqri-twerk-choreo-with-my.html
2. Each must have `<script defer src="/assets/twk-auto-unlock-videos.js?v=..."></script>`
   before `</body>`.

---

## Symptom: PowerShell injection broke many HTMLs at once

**Cause:** regex matched literal `<head>` inside CSS comments.

**Recovery:**
1. Search for the bug pattern:
```powershell
Get-ChildItem -Recurse -Filter "*.html" | Where-Object {
  $c = Get-Content $_.FullName -Raw
  $c -match 'Nothing inline' -or $c -match 'twk_killed_20260509_v2.*twk_killed_20260509_v2'
}
```
2. For each affected file, manually remove the duplicate kill-script + style block.
3. Use `POWERSHELL_RECIPES.md` dedup recipe.

---

## Symptom: thumbnail of OTHER PLAYLISTS section on video pages all black

**Cause:** video page doesn't have the inline force-thumbs script in head.

**Fix path:**
1. The inline `<style id="twk-force-thumbs">` + `<script>` should be near
   the top of `<head>` (after the kill script).
2. If missing, the guardian script will eventually do the work, but it
   runs at DOMContentLoaded so there's a flicker. Add the inline block
   for instant rendering.

---

## Quick "is everything OK" checklist

In console of any page:
```js
__twkGuardian.selfTest()
```

Healthy state for founder:
```
{
  version: '1.0',
  isFounder: true,
  armorCSS: true,
  thumbsHijacked: 0,
  auth: { email: 'alexiatwerkoficial@gmail.com', hasToken: true },
  balance: >= 1000009,
  tier: 'vip'
}
```

Anything different = check that field's symptom above.
