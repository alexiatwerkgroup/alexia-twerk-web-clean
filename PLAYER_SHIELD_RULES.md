# Twerkhub Video Player — Standard Rules (v2.0)

**Established:** 2026-05-03
**Applies to:** every page that embeds YouTube videos (playlists, video detail pages, hero videos, anywhere a `<iframe src=youtube.com/embed/...>` exists).

## 1. Always include the shield script

Right before `</body>` on every video-bearing page:

```html
<script defer src="/assets/twk-video-shield.js?v=20260503-p6"></script>
```

The shield automatically applies to ALL `iframe[src*="youtube.com/embed/"]` and `iframe[src*="youtube-nocookie.com/embed/"]` on the page. No per-video config needed.

## 2. What the shield does (automatically)

- **Click-capture overlay** → blocks every click on the iframe (no escape to youtube.com)
- **Custom controls** in bottom-right: ⏪ ⏩ 🔇 ⛶  (back 10s · forward 10s · mute toggle · fullscreen)
- **Premium glass CTA** in top-left: "+1,500 4K videos →" / "get the full collection"
  - Pulsing pink-brand glow (animation `twkCtaPulse` 2.6s)
  - Shimmer line sweep (animation `twkCtaShimmer` 3.2s)
  - Click → `https://discord.gg/WWn8ZgQMjn` (opens new tab)
  - Scales up automatically in fullscreen mode
- **Zoom 1.22** centered → crops YouTube title (top), watermarks (bottom), logo flash (sides)
- **Start at second 5** → skips YouTube intro logo
- **Max quality** → `vq=hd2160` URL param + postMessage `setPlaybackQuality('highres')` + `setPlaybackQualityRange('hd2160','hd2160')`
- **Keyboard ← / →** → seeks ±10s on the active/fullscreen iframe
- **Fullscreens the wrapper** (not the iframe) → shield stays active in fullscreen
- **Auto-unmute** on entering fullscreen (user is committing to watch)
- **Forces YouTube embed params**: `controls=0&fs=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&enablejsapi=1`
  → no native YouTube UI is visible (no title, no share, no related videos, no annotations, no Watch on YouTube)

## 3. Hero structure (every playlist page)

```html
<header class="twerkhub-pl-hero">
  <div class="twerkhub-pl-kicker">/ vault · 1,500+ uncut cuts · VIP only</div>
  <h1><span class="twk-sr-only">{KEYWORD} · </span>{Clean Title} <em>{accent}</em> · uncut &amp; private.</h1>
</header>
```

Where:
- `{KEYWORD}` = the SEO-critical term hidden visually but readable by Google (e.g. `TTL`, `K-pop`, etc.)
- `{Clean Title}` = the visible, clickbait-y title (e.g. `Latin models`, `Korean girls`, etc.)
- `{accent}` = italic gradient word (e.g. `models`, `girls`, etc.)
- **No subtitle `<p>`** under h1 — the info is in the in-video CTA. Don't repeat.
- **No hero buttons** for Discord/Telegram — the CTA is in-video. Don't repeat.

The required `.twk-sr-only` style:

```css
.twk-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
```

## 4. Video naming (SEO-only, no real names)

**Never** include real model/channel names visibly. Replace with vertical-keyword phrases:

| Pattern | SEO-friendly replacement |
|---|---|
| `<Person> part N` | `<Vertical Keyword> Cut · Vol N` |
| `(MV) <Person> - <Outfit>` | `<Vertical Keyword> · <Outfit Detail>` |
| Channel author `<Real Channel>` | `<Curated Source>` (e.g. "Latin Models Vault", "K-pop Vault", "Editorial Cut") |

Update everywhere: `aria-label`, `alt`, `<div class="rk-title">`, `<div class="rk-meta">`, schema.org `VideoObject.name`, `VideoObject.author.Person.name`, meta description, og:title, twitter:title.

## 5. Layout integrity

- `creators-grid` and similar grid containers MUST close before `<section class="twk-related">` and `<footer class="twk-mf">`. Always verify the `</div>` closes properly.
- Add `.twk-related,.twk-mf{grid-column:1/-1!important}` defensively in every page (already in 189+ pages).

## 6. Bumping the cache

When updating the shield script, bump the version param: `?v=20260503-pN` → `?v=20260503-p(N+1)` across all pages that load it. Use a Get-ChildItem PowerShell sweep, NOT git diff piping (encoding issues with Asian filenames).

## 7. PowerShell rule for file writes

NEVER use `Set-Content -Encoding UTF8` (writes BOM in PS 5.x).
Always use `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))` (UTF-8 without BOM).

## Summary: when adding/editing a video page

1. Apply hero structure (sr-only keyword + clean title + no subtitle + no hero CTAs)
2. Rename any real names to SEO keywords
3. Add the `<script defer src="/assets/twk-video-shield.js?v=20260503-p6"></script>` before `</body>` if not already present
4. The shield handles the rest automatically
