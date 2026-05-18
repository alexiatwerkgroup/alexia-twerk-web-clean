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
   - Reads `localSt

---

## ⚠️ CRITICAL UPDATE — server-side blocking (April 2026)

**The runtime detection model failed in production.** YouTube shows its own "Video unavailable / Watch on YouTube" message INSIDE the iframe BEFORE our JS can swap it. Result: visitors saw a clickable link to watch the +18 video on YouTube directly — bypass of the entire paywall.

### The corrected rule

For any video classified as `blocked` (age-restricted) in `assets/youtube-age-classification.json`:

- **DO NOT render the YouTube iframe in HTML at all**
- **Render the static "+18 LOCKED CONTENT" modal HTML directly in the page**
- The iframe is replaced server-side at generation time, not runtime

### Lock modal HTML (use exactly this)

```html
<div class="vd-player vd-locked" data-vid="VIDEO_ID">
  <div class="vd-lock-modal">
    <div class="vd-lock-padlock">[svg padlock]</div>
    <div class="vd-lock-kicker">+18 · Locked content</div>
    <h2 class="vd-lock-title">This video is <em>locked</em>.</h2>
    <p class="vd-lock-body"><strong>To unlock, contact Alexia on Discord or Telegram.</strong> YouTube blocks this video from playing outside their platform because it is age-restricted. The uncensored version comes from Alexia directly, in private.</p>
    <div class="vd-lock-cta">
      <a class="vd-lock-btn discord" href="https://discord.gg/WWn8ZgQMjn" target="_blank" rel="noopener">Contact on Discord</a>
      <a class="vd-lock-btn telegram" href="https://t.me/+0xNr69raiIlmYWRh" target="_blank" rel="noopener">Contact on Telegram</a>
    </div>
    <div class="vd-lock-footer">Free invite · 18+ only · Private</div>
  </div>
</div>
```

CSS for `.vd-locked`, `.vd-lock-modal`, etc. is in the `<style>` block of every blocked detail page.

### How to classify (when adding new videos)

```bash
# Run the classifier (uses oEmbed + watch page parse)
python3 scripts/classify-youtube-age.py
# Updates assets/youtube-age-classification.json
# Then re-run the detail page generator — it will server-side-block any video marked 'blocked'
```

### The classifier logic

```python
def classify(vid):
    # 1) oEmbed: 401/403 = age-restricted
    try: urllib.request.urlopen(f"https://youtube.com/oembed?url=...&format=json")
    except HTTPError as e:
        if e.code in (401, 403): return 'blocked'
    # 2) Watch page: look for restriction markers
    html = fetch(f"https://youtube.com/watch?v={vid}&hl=en")
    for marker in ['"isAgeRestricted":true', 'AGE_VERIFICATION_REQUIRED',
                   'LOGIN_REQUIRED', 'Sign in to confirm your age', 'age-restricted']:
        if marker in html: return 'blocked'
    return 'public'
```

### Verified working in production

- ✅ FREE preview (iframe plays clean): `/korean-girls-kpop-twerk/걸크러쉬-girl-crush-하윤-im-so-sexy-...html`
- ✅ +18 LOCKED (modal renders directly, iframe never loads): `/korean-girls-kpop-twerk/throw-it-back-トゥワーク-みくり-miqri-twerk-choreo-miqri-twerk.html`
- Validator confirms 986/986 pages valid

### Mistake history (do not repeat)

| Iteration | Approach | Why it failed |
|---|---|---|
| 1 | Paywall on all 175 | Wrong — public videos got false +18 lock |
| 2 | JSON `free` field | Wrong — not aligned with YouTube classification |
| 3 | Runtime JS detection (postMessage) | YouTube shows "Watch on YouTube" link BEFORE our JS catches the error → bypass |
| 4 (current) | **Server-side iframe replacement** | ✅ iframe never renders for blocked, modal is in initial HTML |

### Audit command

```bash
# Verify the count of locked pages per playlist matches the cache
python3 -c "
import json, glob
c = json.load(open('assets/youtube-age-classification.json'))
for f in ['try-on-hot-leaks','cosplay-fancam-leaks','korean-girls-kpop-twerk','latina-model-leaks','twerk-hub-leaks']:
    locked = sum(1 for p in glob.glob(f'{f}/*.html') if not p.endswith('/index.html') and 'vd-locked' in open(p).read())
    print(f'{f}: {locked} locked')
"
```
