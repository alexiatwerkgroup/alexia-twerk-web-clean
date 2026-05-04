# Twerkhub Video Player — Standard Rules (v2.1)

**Established:** 2026-05-03
**Last update:** 2026-05-03 (added nocookie rule, performance fixes, hero rotator standards)
**Applies to:** every page that embeds YouTube videos (playlists, video detail pages, hero videos, anywhere a `<iframe src="*youtube*/embed/...">` exists).

---

## RULE 0 — ALWAYS use youtube-nocookie.com (NEVER youtube.com)

**Critical for UX:** the `youtube.com/embed/` variant triggers YouTube's "Sign in to confirm you're not a bot" interstitial much more frequently than `youtube-nocookie.com/embed/`. Since our shield blocks all clicks (anti-escape), users CANNOT click the bot challenge to recover — they'd be stuck.

**Always use:** `https://www.youtube-nocookie.com/embed/{ID}?...`

The shield's `patchSrc()` automatically rewrites `youtube.com` → `youtube-nocookie.com` at runtime, but for the FIRST load (before shield kicks in) the HTML must already have nocookie to avoid double-loading.

**Hardcoded iframe src on each playlist page** must use nocookie:
```html
<iframe src="https://www.youtube-nocookie.com/embed/{ID}?autoplay=1&mute=1&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1&...">
```

Schema.org `embedUrl` and `contentUrl` should also use nocookie when possible.

---

## RULE 1 — Shield script tag

Every video-bearing page needs this right before `</body>`:

```html
<script defer src="/assets/twk-video-shield.js?v=20260503-p10"></script>
```

The shield auto-detects `iframe[src*="youtube.com/embed/"]` and `iframe[src*="youtube-nocookie.com/embed/"]` and applies the full treatment. No per-video config needed.

## RULE 2 — Per-page CTA override (if non-default)

By default the in-video CTA says "+1,500 4K videos →" linking to Discord. Override via `window` globals BEFORE the shield script loads:

```html
<script>
  window.TWK_VIDEO_CTA_TITLE = '+400 4K videos →';   // count + arrow
  window.TWK_VIDEO_CTA_SUB   = 'get the full collection'; // optional override
  window.TWK_VIDEO_CTA_URL   = 'https://discord.gg/...';  // optional override
</script>
<script defer src="/assets/twk-video-shield.js?v=20260503-p10"></script>
```

## RULE 3 — Performance hints in `<head>`

Add preconnect to YouTube domains (next to existing `dns-prefetch`):

```html
<link rel="preconnect" href="https://www.youtube.com" crossorigin>
<link rel="preconnect" href="https://www.youtube-nocookie.com" crossorigin>
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
```

This pre-warms TLS handshake for ~200-400ms savings on first video load.

---

## What the shield does (automatically)

- **Forces `youtube-nocookie.com`** (rule 0) — least bot-check exposure
- **Click-capture overlay** → blocks every click on the iframe (no escape to youtube.com)
- **Custom controls** in bottom-right: ⏪ ⏩ 🔇 ⛶ (back 10s · forward 10s · mute toggle · fullscreen)
- **Premium glass CTA** in top-left: title + subtitle (configurable per page)
  - Pulsing pink-brand glow (animation `twkCtaPulse` 2.6s)
  - Shimmer line sweep (animation `twkCtaShimmer` 3.2s)
  - Click → `https://discord.gg/WWn8ZgQMjn` (configurable)
  - Scales up automatically in fullscreen mode
- **Zoom 1.22 from center** → crops YouTube title (top), watermarks (bottom), logo flash (sides). Same in fullscreen.
- **Start at second 5** → skips YouTube intro logo
- **Max quality CAP at 4K** (hd2160) → `vq=hd2160` URL param + postMessage `setPlaybackQuality('hd2160')` + `setPlaybackQualityRange('hd2160','hd2160')`. NEVER 8K.
- **Keyboard ← / →** → seeks ±10s on the active/fullscreen iframe
- **Fullscreens the wrapper** (not the iframe) → shield stays active in fullscreen
- **Auto-unmute** on entering fullscreen (user is committing to watch)
- **Forces YouTube embed params**: `controls=0&fs=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1`
  → no native YouTube UI is visible (no title, no share, no "Watch on YouTube", no related videos, no annotations)
- **Property setter override** on iframe.src and iframe.setAttribute → patches URL BEFORE the browser starts the network request. Eliminates the 2-3s double-load when switching videos.

---

## Hero structure (every playlist page)

```html
<style id="twk-hero-sr-css">
.twk-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
</style>
<header class="twerkhub-pl-hero">
  <div class="twerkhub-pl-kicker">/ vault · {COUNT}+ {VERTICAL} cuts · {ACCESS_LABEL}</div>
  <h1><span class="twk-sr-only">{KEYWORD} · </span>{Clean Title} <em>{accent}</em> · uncut &amp; private.</h1>
  <!-- Optional subtitle: keep ONLY if needed (e.g. K-pop kept "Korean & Asian fancam vault · 4K dance cuts · free for everyone") -->
</header>
<script>window.TWK_VIDEO_CTA_TITLE = '+{COUNT} 4K videos →';</script>
```

Where:
- `{KEYWORD}` = SEO-critical term hidden visually (e.g. `TTL`, `K-pop`)
- `{COUNT}` = total video count (e.g. `1,500`, `400`)
- `{VERTICAL}` = niche descriptor (e.g. `uncut`, `Korean`, `cosplay`)
- `{ACCESS_LABEL}` = `VIP only`, `free archive`, etc. — must MATCH subtitle messaging
- `{Clean Title}` = visible clickbait-y title (e.g. `Latin models`, `Asian girls fancam & hot dance videos`)
- `{accent}` = italic gradient word

**Never:**
- TTL (or any vertical keyword) visibly in `<h1>` — only in sr-only and meta tags
- Hero buttons for Discord/Telegram pills (the in-video CTA replaces them)
- Subtitle that contradicts kicker access label

## Video naming (SEO-only, no real names)

Replace ALL real model/channel/song names with vertical-keyword phrases:

| Pattern | SEO replacement |
|---|---|
| `<Person> part N` | `<Vertical> Cut · Vol N` |
| `(MV) <Person> - <Outfit>` | `<Vertical> · <Outfit Detail>` |
| Channel `<Real Channel>` | `<Curated Source>` (e.g. "Latin Models Vault", "K-pop Vault") |
| Schema CJK names | `<Vertical> Korean Cut` (or similar generic) |

Update everywhere: `aria-label`, `alt`, `<div class="rk-title">`, `<div class="rk-meta">`, schema.org `VideoObject.name`, `VideoObject.author.Person.name`, `description`, `og:title`, `twitter:title`.

For long catalogs (50+ videos), use Perl one-liner:
```perl
perl -i -pe '
  if (/data-number="#(\d+)"/) {
    my $n = $1;
    s/aria-label="[^"]*"/aria-label="<Vertical> Cut · Vol $n"/;
  }
' page.html
```

---

## Hero rotator (home `index.html` only)

If the page has multiple featured videos cycling:

```js
var pool=[
  {i:'<videoId>', s:<startSec>, w:<weight>, m:<countdownMin>},
  // ...
];
```

- **Initial pick**: weighted random based on `w`
- **Next button**: cycles through pool **in fixed order** (1→2→3→4→1), never repeats current. NO randomness on Next click.
- **Each video has its own countdown** (varying 15-20 minutes between them)
- **Auto-unmute** via postMessage after iframe loads (browsers may block if no prior interaction)

---

## Layout integrity

- `creators-grid` and similar grid containers MUST close before `<section class="twk-related">` and `<footer class="twk-mf">`
- Add defensively in every page: `.twk-related,.twk-mf{grid-column:1/-1!important}` (already in 189+ pages)

---

## File-truncation safety check

After every edit to a video page, verify:

```bash
tail -8 page.html
```

Must end with `</body>\n</html>` and have all defer scripts above it. Common truncation symptom: file ends mid-script-tag like `<script defer src="/assets/...js?v=2026` without closing.

If truncated:
```bash
sed -i 's|<script defer src="/assets/[^"]*$||' page.html
cat >> page.html << 'EOF'
<script defer src="/assets/profile-stats-live.js?v=20260430-p2"></script>
<script defer src="/assets/session-tracker.js?v=20260503-p2"></script>
<script defer src="/assets/twk-video-shield.js?v=20260503-p10"></script>
</body>
</html>
EOF
```

---

## Bumping shield version

When updating `twk-video-shield.js`, bump the version param across all pages that load it:

```powershell
Get-ChildItem -Path . -Filter *.html -Recurse -File | ForEach-Object {
  $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  $orig = $text
  $text = $text -replace 'twk-video-shield\.js\?v=20260503-p\d+','twk-video-shield.js?v=20260503-pN'
  if ($text -ne $orig) {
    [System.IO.File]::WriteAllText($_.FullName, $text, (New-Object System.Text.UTF8Encoding($false)))
  }
}
```

---

## PowerShell rule for file writes

NEVER use `Set-Content -Encoding UTF8` (writes BOM in PS 5.x).
Always use `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))` (UTF-8 without BOM).

---

## Checklist when adding/editing a video page

1. [ ] Hero structure: sr-only keyword + clean title + (optional) subtitle + NO hero CTAs
2. [ ] All real names → SEO-friendly replacements (aria-labels, alt, rk-title, rk-meta, schema.org)
3. [ ] All hardcoded iframe src use `youtube-nocookie.com` (NOT `youtube.com`)
4. [ ] Shield script tag present before `</body>`
5. [ ] Per-page CTA override (if not default `+1,500`)
6. [ ] Preconnect hints in `<head>` for YouTube domains
7. [ ] No mojibake (encoding artifacts like &quot;a-broken-triangle&quot;, double-byte dots, accented vowels, etc.)
8. [ ] File ends with proper `</body></html>` (no truncation)
9. [ ] Layout: grid containers close before related/footer sections
10. [ ] Quality cap: 4K (`hd2160`), never 8K
