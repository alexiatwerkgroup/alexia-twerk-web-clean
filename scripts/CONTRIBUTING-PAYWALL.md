# Paywall + age-gate rules — TWERKHUB (FINAL, source-of-truth)

## The single rule

Paywall placement on per-video detail pages mirrors the visual model of `/hottest-cosplay-fancam/` and `/ttl-latin-models/`:

- **Hot ranking videos** (the 5 in the sidebar, marked `"free": true` in the playlist JSON) → **NO paywall** (free preview, anyone can watch)
- **Grid videos** (everything else) → **YES paywall** (+18 lock + "Contact on Discord/Telegram" gate)

This is an **editorial / curatorial** decision — it's how the curator (Anti) decides what's free preview vs members-only. It is NOT driven by YouTube's age classification. The fact that the lock badge says "+18" is part of the brand voice, not a YouTube policy reflection.

## Where the rule lives

Source of truth for each playlist: `assets/{playlist}-videos.json`

```json
{
  "hot_ranking": [
    { "id": "...", "title": "...", "free": true },   ← these 5 are free preview
    ...
  ],
  "grid": [
    { "_id": "...", "_title": "..." },                ← these are members-only (+18 lock)
    ...
  ]
}
```

## Generation rule (for new playlists or new videos)

When generating a detail page from a playlist JSON video entry:

1. If the entry is in `hot_ranking[]` AND has `"free": true`:
   - Generate page WITHOUT the 3 paywall scripts
2. Otherwise (grid entry, or hot_ranking without free flag):
   - Inject the 3 paywall scripts before `</body>`:
     ```html
     <script src="/assets/twerkhub-auth.js?v=20260426-p8" defer></script>
     <script src="/assets/twerkhub-paywall.js?v=20260426-p8" defer></script>
     <script src="/assets/twerkhub-age-gate.js?v=20260426-p8" defer></script>
     ```
3. Playlist HOME pages (`/{playlist}/index.html`) ALWAYS keep the paywall — they're the members-only landing.

## Current state (5 playlists, 175 detail pages)

| Playlist | Free preview | Members-only | Total |
|---|---|---|---|
| `/try-on-hot-leaks/` | 5 | 11 | 16 |
| `/cosplay-fancam-leaks/` | 5 | 56 | 61 |
| `/korean-girls-kpop-twerk/` | 5 | 45 | 50 |
| `/latina-model-leaks/` | 5 | 13 | 18 |
| `/twerk-hub-leaks/` | 5 | 25 | 30 |
| **TOTAL** | **25** | **150** | **175** |

## Pages that have the paywall (full list)

- All 150 grid detail pages (above)
- All 5 playlist HOME pages (`/{playlist}/index.html`)
- `/account.html`, `/paid-content.html`, `/alexia-video-packs.html`, `/404.html`
- The original leaks pages: `alexia-twerk-leaks.html`, `playlist-*-leaks.html` legacy roots

## Pages that DO NOT have the paywall

- 25 free-preview detail pages (the 5 hot_ranking per playlist)
- All public marketing pages (`/blog/*`, `/creator/*`, `/about.html`, etc.)
- The home page `/`

## Audit command

```powershell
# Per-playlist breakdown
foreach ($folder in 'try-on-hot-leaks','cosplay-fancam-leaks','korean-girls-kpop-twerk','latina-model-leaks','twerk-hub-leaks') {
  $total = (Get-ChildItem "$folder/*.html" | Where-Object { $_.Name -ne 'index.html' }).Count
  $with = (Get-ChildItem "$folder/*.html" | Where-Object { $_.Name -ne 'index.html' -and (Get-Content $_ -Raw) -match 'twerkhub-paywall.js' }).Count
  "$folder`: $with with paywall, $($total - $with) free preview"
}
```

Expected output (current state):
```
try-on-hot-leaks: 11 with paywall, 5 free preview
cosplay-fancam-leaks: 56 with paywall, 5 free preview
korean-girls-kpop-twerk: 45 with paywall, 5 free preview
latina-model-leaks: 13 with paywall, 5 free preview
twerk-hub-leaks: 25 with paywall, 5 free preview
```

## Reference implementation (the visual model to mirror)

- `/ttl-latin-models/index.html` — sidebar 5 free + grid all locked with +18 badge + "Contact on Discord/Telegram"
- `/hottest-cosplay-fancam/index.html` — same pattern

When generating new playlist content, replicate this exact UX:
- Sidebar free, grid locked
- Lock modal copy: "+18 LOCKED CONTENT — This video is locked. To unlock, contact Alexia on Discord or Telegram. YouTube blocks this video from playing outside their platform because it is age-restricted. The uncensored version comes from Alexia directly, in private."
- Buttons: "Contact on Discord" (Discord URL) + "Contact on Telegram" (Telegram URL)

## Lessons from April 2026 (do not repeat)

**Iteration 1:** Generated 175 pages with paywall on ALL → wrong, the 5 free previews per playlist must be open.

**Iteration 2:** Removed paywall from ALL → wrong, the grid items must have it.

**Iteration 3:** Tried to use YouTube oEmbed (+18 detection) → wrong, the rule is editorial not YouTube-driven. Only 5 videos came back age-restricted, leaving 167 unlocked when they should be locked.

**Iteration 4 (final, correct):** Use the JSON `free` field. `hot_ranking` with `free: true` = no paywall. Everything else = paywall. Matches the visual model exactly.

**Going forward:** When adding videos to a playlist JSON, the only field that controls paywall is `free` (in `hot_ranking[]`). Don't second-guess. Don't add new flags. The model is settled.
