# Paywall + age-gate rules — TWERKHUB (FINAL FUNCIONAL — verified in production)

This is the source-of-truth for any new playlist or new video added to the platform. **Every new detail page must follow this exact structure.** Validated against `/ttl-latin-models/`, `/hottest-cosplay-fancam/`, `/try-on-hot-leaks/`, and the 175 detail pages confirmed working in production.

## The 4 rules (in priority order)

### Rule 1 — Detail pages load EXACTLY 2 paywall scripts (not 3)

```html
<script src="/assets/twerkhub-auth.js?v=20260426-p8" defer></script>
<script src="/assets/twerkhub-age-gate.js?v=20260426-p8" defer></script>
```

**DO NOT load `twerkhub-paywall.js`** on detail pages. That module is the LEGACY paywall and adds an "EXCLUSIVO" pill + dark overlay to every non-hot card — not what we want on per-video pages.

`twerkhub-paywall.js` is only loaded on:
- Playlist HOME pages (`/{playlist}/index.html`)
- `/account.html`, `/paid-content.html`, `/alexia-video-packs.html`, `/404.html`

### Rule 2 — Player markup must include `data-vid` (and optionally `data-protected`)

```html
<div class="vd-player" data-vid="VIDEO_ID" data-protected="1">
  <iframe id="vd-player-iframe" data-vid="VIDEO_ID" data-protected="1"
          src="https://www.youtube.com/embed/VIDEO_ID?autoplay=0&amp;rel=0&amp;modestbranding=1&amp;playsinline=1&amp;enablejsapi=1&amp;widget_referrer=https%3A%2F%2Falexiatwerkgroup.com&amp;origin=https%3A%2F%2Falexiatwerkgroup.com"
          title="..." allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>
</div>
```

- `data-vid` is **required** on both `.vd-player` and `<iframe>` so the age-gate JS can find them.
- `data-protected="1"` is **required only** when the video is in JSON `hot_ranking[]` with `"free": true` (the 5 top-five sidebar videos per playlist). This flag prevents SAGRADA #9 violation — protected videos never get the lock badge.
- `enablejsapi=1` + `widget_referrer` + `origin` params are required so YouTube fires the `onError` event we listen for.

### Rule 3 — Inline bridge init script before `</body>`

```html
<script>
(function(){
  function init(){
    var player = document.querySelector('.vd-player[data-vid]');
    if (!player) return;
    var vid = player.getAttribute('data-vid');
    var protectedFlag = player.hasAttribute('data-protected');
    if (!vid) return;
    var ag = window.TwkAgeGate;
    // 1) If videoId is already memorized as blocked → swap to +18 modal
    if (ag && ag.isBlocked && ag.isBlocked(vid) && !protectedFlag) {
      try { ag.show(player, vid); return; } catch(_){}
    }
    // 2) Listen for YT onError (codes 101 = embed disabled, 150 = age-restricted)
    window.addEventListener('message', function(ev){
      if (!ev.data || typeof ev.data !== 'string') return;
      try {
        var d = JSON.parse(ev.data);
        if (d && d.event === 'onError' && (d.info === 101 || d.info === 150)) {
          if (!protectedFlag && window.TwkAgeGate && window.TwkAgeGate.handleYTError) {
            window.TwkAgeGate.handleYTError(d.info, vid, player);
          }
        }
      } catch(_){}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 600); }, { once: true });
  } else {
    setTimeout(init, 600);
  }
})();
</script>
```

### Rule 4 — Playlist HOME pages keep the FULL paywall stack

Each `/{playlist}/index.html` must keep loading `twerkhub-paywall.js` because that's where the gated grid + FOMO strip + sidebar ranking live. The legacy module is correct THERE.

Detail pages don't need it because each is for ONE specific video — the age-gate alone handles the "+18 LOCKED" modal for that single video.

## How the runtime decision works (so you understand what to expect)

1. User opens `/cosplay-fancam-leaks/some-video.html`
2. `twerkhub-age-gate.js` loads
3. Inline bridge runs after 600ms:
   - Reads `localStorage.twk_blocked_videos[VIDEO_ID]`
   - If marked blocked → swaps the iframe for the "+18 LOCKED CONTENT — Contact on Discord/Telegram" modal
   - If not blocked → leaves the iframe playing
4. Independently, the YouTube iframe (with `enablejsapi=1`) fires `onError` if YouTube refuses to embed
   - `info: 101` (embed disabled) or `info: 150` (age-restricted)
   - Bridge catches it via `postMessage` and calls `TwkAgeGate.handleYTError()`
   - That memoizes the videoId in localStorage AND swaps the iframe for the modal
5. Top 5 videos (with `data-protected="1"`) are immune — even if YouTube returns an error, the bridge skips the swap. SAGRADA #9.

## Generating a new playlist or adding videos — the exact steps

### Adding a single new video to an existing playlist

1. Add the video entry to `assets/{playlist}-videos.json` under `grid[]` (or `hot_ranking[]` if it's a featured top-5)
2. Run the generator: `python3 scripts/generate-detail-pages.py {playlist}` *(create this script from the template below if missing)*
3. Verify with `node scripts/validate-pages.js` (must say "All N pages valid")
4. Commit + push

### Creating a new playlist from scratch

1. Create `assets/{new-playlist}-videos.json` with the same shape as existing ones (`hot_ranking[]` of 5 free + `grid[]` with the rest)
2. Generate the playlist HOME page by cloning `try-on-hot-leaks/index.html` and swapping:
   - `<title>`, `<meta description>`, canonical URL
   - The 16 video IDs (5 in sidebar `<a class="rk-item" data-vid="...">` + first 11 in grid `<a class="vcard" data-vid="...">`)
   - H1 + intro text
   - Keep the 4 paywall scripts at the bottom: `twerkhub-auth.js`, `twerkhub-paywall.js`, `twerkhub-age-gate.js`, plus `twerkhub-pl-theater.js`
3. Generate detail pages following Rules 1-3 above (each video gets its own `.html` file in `/{playlist}/`)
4. Update `sitemap.xml` and `sitemap-videos.xml` with the new URLs
5. Run validator → fix any errors

## What was learned (do not repeat these mistakes)

| Mistake | Fix |
|---------|-----|
| Loading `twerkhub-paywall.js` on detail pages | Only load on HOME pages. Detail pages get only `auth + age-gate` |
| No `data-vid` on the player container | Required so age-gate finds it |
| No `data-protected="1"` on top-5 detail pages | Required so SAGRADA #9 can skip them |
| No bridge init script | The age-gate JS doesn't auto-listen to YT errors on detail pages without it |
| Trying to classify +18 statically (oEmbed, JSON `free` field) | The model is RUNTIME — let age-gate decide, memoize, persist |
| Forgetting to create playlist HOME page | Detail pages link back to `/{playlist}/` — that page MUST exist or you get 404 |

## Audit command

```bash
# Verify all detail pages in all playlists are consistent
for folder in try-on-hot-leaks cosplay-fancam-leaks korean-girls-kpop-twerk latina-model-leaks twerk-hub-leaks; do
  total=$(ls $folder/*.html | grep -v index.html | wc -l)
  with_age=$(grep -l "twerkhub-age-gate.js" $folder/*.html | grep -v index.html | wc -l)
  with_legacy=$(grep -l "twerkhub-paywall.js" $folder/*.html | grep -v index.html | wc -l)
  with_bridge=$(grep -l "TwkAgeGate" $folder/*.html | grep -v index.html | wc -l)
  echo "$folder: $total detail pages | age-gate=$with_age, legacy-paywall=$with_legacy (must be 0), bridge=$with_bridge"
done
```

Expected output:
```
try-on-hot-leaks: 16 detail pages | age-gate=16, legacy-paywall=0, bridge=16
cosplay-fancam-leaks: 61 detail pages | age-gate=61, legacy-paywall=0, bridge=61
korean-girls-kpop-twerk: 50 detail pages | age-gate=50, legacy-paywall=0, bridge=50
latina-model-leaks: 18 detail pages | age-gate=18, legacy-paywall=0, bridge=18
twerk-hub-leaks: 30 detail pages | age-gate=30, legacy-paywall=0, bridge=30
```

## Reference

Working examples in production confirmed by user:
- ✅ Public detail page (no overlay, plays clean): `/try-on-hot-leaks/are-these-leggings-good-for-dancing-tanya-safonova-in-v.html`
- ✅ +18 detail page (shows the lock modal): `/twerk-hub-leaks/chica-mala-trap-latino-lexi-panterra-twerking-2024-expl.html`
- ✅ Playlist HOME (theatre + sidebar + grid + paywall): `/ttl-latin-models/`, `/hottest-cosplay-fancam/`, `/try-on-hot-leaks/`
