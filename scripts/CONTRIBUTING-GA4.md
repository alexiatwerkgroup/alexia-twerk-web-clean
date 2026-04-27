# GA4 tracking rules — TWERKHUB

Every public page on the platform must have GA4 (`G-YSFR7FHCLS`) installed.
The `validate-pages.js` validator FAILS if a public HTML page is missing GA4 — so any new page without it cannot ship.

## The exact snippet (copy as-is into `<head>`, just before `</head>`)

```html
<!-- GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-YSFR7FHCLS"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-YSFR7FHCLS', { send_page_view: true });
</script>
```

## Tracking scripts (copy before `</body>` on every public page)

```html
<script defer src="/assets/js/twerkhub-ga4-video-tracking.js"></script>
<script defer src="/assets/js/twerkhub-ga4-conversion-tracking.js"></script>
```

These two files auto-instrument:

**`twerkhub-ga4-video-tracking.js`** — HTML5 `<video>` events (NOT YouTube iframes):
- `video_start` (on play)
- `video_progress_25`, `video_progress_50`, `video_progress_75`
- `video_complete`
- Each milestone fires once per video per page load.
- Uses MutationObserver — also tracks videos added dynamically.

**`twerkhub-ga4-conversion-tracking.js`** — clicks + scroll + engagement:
- `cta_click` — buttons/links with text matching join/subscribe/unlock/access/enter/etc.
- `outbound_onlyfans` / `outbound_telegram` / `outbound_discord` / `outbound_whatsapp` / `outbound_patreon` / `outbound_youtube_*` / `outbound_instagram` / `outbound_twitter` / `outbound_tiktok`
- `outbound_click` — generic external link
- `membership_click`, `token_click`, `creator_profile_click`, `private_access_click`
- `scroll_25` / `scroll_50` / `scroll_75` / `scroll_90`
- `engaged_30s` / `engaged_60s` / `engaged_120s` (only counts visible time — pauses when tab is hidden)
- Uses event delegation — does NOT block navigation, does NOT need inline `onclick`.

Each event includes `page_path` and `page_title` automatically.

## Utility pages (do NOT add GA4)

These page-name patterns are recognized as internal/utility and are skipped by the validator:

- `admin*` / `*admin*`
- `auth-*` / `auth-callback`
- `callback*`
- `login*`
- `paid-content`
- `variants?-*`, `oriental-final`, `playlist-model-1-dark-premium`
- `premium-*`, `savage-twerk-video`
- `VARIANTE-*`, `test-*`

If you create a new utility page, name it with one of these prefixes (or update `UTILITY_PATTERNS` in both `scripts/validate-pages.js` and the install script).

Utility pages should also have `<meta name="robots" content="noindex,nofollow">`.

## Adding a new page (the safe checklist)

1. Use one of the existing pages as a template (e.g. `/blog/why-twerkhub-has-no-algorithm-feed.html` for a blog post, `/creator/wangong-lin.html` for a creator profile).
2. Confirm the GA4 snippet is in `<head>` and the two tracking scripts are before `</body>`.
3. Run locally:
   ```powershell
   node scripts/validate-pages.js
   ```
   It will fail with a clear message if GA4 is missing or duplicated.
4. The pre-commit hook also runs `check-encoding.js` — combined, the safety net catches mojibake, BOM, and missing GA4 before the commit lands.

## Validating across the whole repo

```bash
# Full validate (encoding + GA4 + structure)
node scripts/validate-pages.js

# GA4 status only (count loaders + configs per file)
grep -rL "G-YSFR7FHCLS" --include="*.html" .   # files MISSING GA4
grep -rc "G-YSFR7FHCLS" --include="*.html" . | grep -v ":1$" | grep -v ":0$"   # files with !=1 occurrence
```

## Why the validator was added

In April 2026 we discovered only 55 of 808 HTML pages had GA4 installed — 93% of the platform was invisible in analytics. After installing GA4 across the rest, the validator now blocks any new public page from shipping without it. No tracking gap can recur.

## Bypass (last resort)

```powershell
git commit --no-verify -m "your message"
```

Only use this if validate-pages.js gives a false positive AND you've personally confirmed the page has the snippet.
