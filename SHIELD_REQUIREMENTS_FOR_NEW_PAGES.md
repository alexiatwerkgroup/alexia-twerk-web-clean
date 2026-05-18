# Shield requirements for new pages (CRITICAL)

> **Whenever a new video page, playlist update, or dancer/creator page is created,
> the FULL shield stack MUST be present. If any layer is missing, users can escape
> to youtube.com and the platform loses control of the embed experience.**

This file is the canonical checklist. Follow it religiously every time you generate
a new HTML that embeds a YouTube video.

---

## When this applies

- Adding a new dancer/creator → her creator page + any new playlist pages with her videos
- Updating an existing playlist (e.g. importing a YouTube playlist) → every new individual video page + the playlist index page
- Cloning a template to make a new video page
- Migrating videos from `_deleted/` back to live
- Any script that generates HTML containing `<iframe src="...youtube...">`

---

## The shield has 3 enforcement layers — ALL must be present

### Layer 1 · HTML static (defense first)

Every iframe pointing to YouTube MUST have these 8 query params **hardcoded** in the `src` attribute (don't rely on JS to add them):

```
controls=0
fs=0
rel=0
modestbranding=1
iv_load_policy=3
disablekb=1
enablejsapi=1
playsinline=1
```

Correct example:
```html
<iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID?controls=0&amp;fs=0&amp;rel=0&amp;modestbranding=1&amp;iv_load_policy=3&amp;disablekb=1&amp;enablejsapi=1&amp;playsinline=1"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerpolicy="strict-origin-when-cross-origin"></iframe>
```

**NEVER use:**
- `<iframe allow="allow-top-navigation">` (lets the iframe escape)
- `<iframe allow="allow-popups">` (lets the iframe open new tabs)

### Layer 2 · Scripts loaded (8 of them, in this order)

Inject all 8 scripts in the `<head>` (or at the start of `<body>`). Order matters: bot-detect first, then guardian, then the shield/gate/theater chain:

```html
<script src="/assets/twk-bot-detect.js?v=20260511-bd1"></script>
<script src="/assets/twk-guardian.js?v=20260509-g1"></script>
<script defer src="/assets/twk-paywall-guard.js?v=20260511-pg1"></script>
<script defer src="/assets/twk-yt-gate.js?v=20260504-p2"></script>
<script defer src="/assets/twk-video-shield.js?v=20260503-p13"></script>
<script defer src="/assets/twerkhub-pl-theater.js?v=20260510-p15"></script>
<script defer src="/assets/twerkhub-age-gate.js?v=20260509-ag3-scrolltop"></script>
<script defer src="/assets/twerkhub-watchdog.js?v=20260426-p1"></script>
<script src="/assets/twerkhub-sw-killer.js?v=20260425-p2" async></script>
```

Update the cache busters when those files change.

### Layer 3 · NO YouTube escape links in the body

These patterns are FORBIDDEN on any page with a video embed:

```html
<!-- ❌ NEVER -->
<a href="https://www.youtube.com/watch?v=...">Source on YouTube</a>
<a href="https://www.youtube.com/@channelname">View channel</a>
<a href="https://youtu.be/...">Short link</a>
<a href="..." target="_blank">  <!-- without rel="noopener" -->

<!-- ❌ NEVER in JS -->
window.open('https://www.youtube.com/...')
location.href = 'https://www.youtube.com/...'
```

If you need to display channel attribution or source ID for credit, use a non-clickable `<span>`:

```html
<!-- ✅ OK -->
<span title="Embedded on Twerkhub" style="cursor:default">
  YouTube · VIDEO_ID · embedded
</span>
```

The ONE exception: the brand link in the footer to `https://www.youtube.com/@alexiatwerkoficial` is intentional (brand presence, social discovery). Do NOT touch that one.

---

## Allowed forms of YouTube reference

| Type | Where | Allowed? |
|---|---|---|
| `<iframe src="...youtube.com/embed/ID?...">` with 8 shield params | inside player | ✅ required for video playback |
| `https://www.youtube.com/watch?v=ID` in JSON-LD `contentUrl` | structured data | ✅ metadata for search engines, not clickable |
| `https://www.youtube.com/embed/ID` in JSON-LD `embedUrl` | structured data | ✅ same |
| `https://i.ytimg.com/vi/ID/...jpg` in `<img>` or `og:image` | thumbnails | ✅ image only |
| `<a href="https://www.youtube.com/@alexiatwerkoficial">` | footer | ✅ brand exception |
| Any other `<a href="...youtube.com...">` | anywhere | ❌ forbidden |

---

## Quick verification script

After creating new pages, run this audit in the project root:

```bash
python3 - <<'EOF'
import os, re
EXCLUDE = {'_deleted', 'node_modules', '.git'}
SCRIPTS = ['twk-bot-detect','twk-guardian','twk-paywall-guard','twk-yt-gate',
           'twk-video-shield','twerkhub-pl-theater','twerkhub-age-gate','twerkhub-watchdog']
REQ = ['fs=0','rel=0','disablekb=1','controls=0','modestbranding=1','iv_load_policy=3']
yt = re.compile(rb'(?:youtube\.com|youtube-nocookie\.com)/embed/[\w-]{11}')
escape = re.compile(rb'<a\s+[^>]*href="https?://(?:www\.)?youtube\.com/(?:@(?!alexiatwerkoficial)|watch|c/|channel/|user/)[^"]*"', re.I)

issues = 0
for root, dirs, files in os.walk('.'):
    dirs[:] = [d for d in dirs if d not in EXCLUDE and not d.startswith('.')]
    for f in files:
        if not f.endswith('.html'): continue
        path = os.path.join(root, f)
        with open(path,'rb') as fh: c = fh.read()
        if not yt.search(c): continue
        miss_scripts = [s for s in SCRIPTS if s.encode() not in c]
        miss_iframe = []
        for m in re.finditer(rb'<iframe[^>]*src="([^"]*(?:youtube\.com|youtube-nocookie\.com)/embed/[^"]*)"', c):
            src = m.group(1).decode().replace('&amp;','&')
            mm = [p for p in REQ if p not in src]
            if mm: miss_iframe.append(mm)
        esc = escape.findall(c)
        if miss_scripts or miss_iframe or esc:
            issues += 1
            print(f"  ❌ {path}")
            if miss_scripts: print(f"     scripts: {miss_scripts}")
            if miss_iframe: print(f"     iframe missing: {miss_iframe[:2]}")
            if esc: print(f"     escape links: {len(esc)}")
print(f"\n{'✅ ALL CLEAN' if issues==0 else f'❌ {issues} pages have issues'}")
EOF
```

Run this **before every commit** that adds video pages.

---

## When using the template-clone pattern

If you clone an existing playlist page to make a new one (the typical pattern), pick a recent template that **already has the full shield**:

- ✅ Good template: `playlist/liuba-russian-twerk-pro-skp9izk.html` (post-2026-05-11)
- ✅ Good template: any page in `try-on-hot-leaks/` (one of the original 5 premium)
- ⚠️ Avoid cloning from pages that haven't been touched since before 2026-05-11

After cloning, change ONLY:
- video ID (in iframe `src`, og:image, og:video, structured data)
- title (`<title>`, `og:title`, `twitter:title`, h1, JSON-LD `name`)
- canonical, og:url, hreflang
- slug-derived URLs

Do NOT remove or modify:
- The 8 script tags
- The iframe shield params (`controls=0&fs=0&...`)
- The CSS shield (toast/thumb force-display rules)

---

## When generating playlist index pages

For index pages like `/sav-twerk-playlist/index.html` that show a grid of videos:

1. Each grid card should link to the **internal page** (`/playlist/video-slug.html`), NOT to `youtube.com/watch?v=ID`.
2. Use the same 8 scripts in head.
3. JSON-LD `ItemList` should use the internal URLs in `item` fields, not YouTube URLs (those go in `contentUrl`/`embedUrl` only, which Google reads as metadata).
4. Thumbnail `<img src>` uses `https://i.ytimg.com/vi/ID/hqdefault.jpg` (allowed, image only).

---

## When adding a new creator/dancer

1. Create `/creator/<dancer-slug>.html` (clone an existing creator page like `/creator/sav-the-booty-queen.html`).
2. Update `/creators.html` index with a card to the new creator.
3. Add internal anchor from creator page to her playlist landing (if any).
4. Add 1 entry to `sitemap.xml`:
   ```xml
   <ns0:url>
     <ns0:loc>https://alexiatwerkgroup.com/creator/dancer-slug.html</ns0:loc>
     <ns0:lastmod>YYYY-MM-DD</ns0:lastmod>
     <ns0:changefreq>monthly</ns0:changefreq>
     <ns0:priority>0.7</ns0:priority>
   </ns0:url>
   ```

The creator page itself does NOT need the YT video shield (no iframe embeds), but it MUST link to videos using internal `/playlist/<slug>.html` URLs only, never `youtube.com/watch?v=...`.

---

## Where the shield scripts live (do not move or rename)

```
assets/twk-bot-detect.js          # bot detection (Googlebot, Bingbot, etc.)
assets/twk-guardian.js            # invariant guardian, self-heal
assets/twk-paywall-guard.js       # paywall + member detection
assets/twk-yt-gate.js             # postMessage chokepoint
assets/twk-video-shield.js        # iframe param enforcement + click blocking
assets/twerkhub-pl-theater.js     # theater player with custom controls
assets/twerkhub-age-gate.js       # 18+ age gate
assets/twerkhub-watchdog.js       # self-healing safety net
assets/twerkhub-sw-killer.js      # SW kill switch (separate, async)
```

If any of these files moves or gets renamed, ALL pages that reference them break their shield.

---

## Confirmed-blindado examples to use as reference

Generated 2026-05-11, all verified clean:

- `playlist/liuba-russian-twerk-pro-skp9izk.html` (any of the 96 renamed slugs)
- `sav-twerk-playlist/index.html` (playlist landing example)
- `playlist/twerk-tiktok-compilation-sav-the-booty-queen-thequeenbsav-5uelvea.html` (one of 5 newly created for Sav)
- Any file in `/twerk-hub-leaks/`, `/hottest-cosplay-fancam/`, `/korean-girls-kpop-twerk/`, `/try-on-hot-leaks/` (all 737 iframes hardened on 2026-05-11)
