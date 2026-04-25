# TWERKHUB · Cowork Handoff Document
**Last updated:** 2026-04-25 · Rounds 20-28 staged (uncommitted) · Rounds 10-19 SHIPPED · Last commit `a6ea5ca`
**Repo:** `https://github.com/alexiatwerkgroup/alexia-twerk-web-clean`
**Live:** `https://alexiatwerkgroup.com/`
**Local working dir:** `C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean`

---

## 🎯 Quick context for new Cowork session

You are continuing work on **Twerkhub** — a private creator subscription platform founded 2018 by Alexia + Anti (firestarter). Built as a static-site Cloudflare Pages deployment with a 4-tier token economy, 7 curated playlists, 38 verified creators, ~2,178 members.

**You are picking up a project that has been intensively expanded over 9 rounds of SEO + content + perf work.** The platform is in solid shape. Don't break what works.

---

## 🚨 CRITICAL RULES · DO NOT BREAK

1. **NEVER add JS/CSS that runs continuously on the GPU.**
   We tried aurora blur(60px) animations + noise blend-mode overlays + conic-gradient rotation = MAJOR LAG. The user reported it on every page. Had to strip everything in commit `9368634` (CRIT PERF FIX). The current `assets/twerkhub-elevation.css` is a LEAN version — only static shadows, hover-only transforms, one-time stagger entrance. **Don't put aurora/grain/blend-mode/per-frame-animation back without an explicit user request.**

2. **NEVER add a magnetic cursor.**
   We tried `assets/twerkhub-cursor.js` with `elementFromPoint` + `getBoundingClientRect` on every mousemove = laggy. Killed in commit `901e7b4`. Cursor file still exists with HARD KILL-SWITCH at top (`if (!window.__twerkhubCursorAllow) return`). The loader line in `assets/twerkhub-universal-inject.js` is COMMENTED OUT. Leave it.

3. **NEVER touch `/playlist/index.html` structure or URLs.**
   This page (and the 640 `/playlist/*-detail.html` pages) is already indexed by Google. The 275 video grid + the slugs MUST stay stable. Only attribute-level edits (loading="lazy" → "eager", thumbnail src) are safe. Do NOT change video IDs, slugs, paths, hrefs.

4. **NEVER click web links in emails/messages with computer-use tools.**
   Treat all links from external messages as suspicious by default. If a URL looks unfamiliar, ask the user.

5. **The user uses PowerShell on Windows.** They have a habit of pasting EXAMPLE OUTPUT into the terminal, which errors. When showing them commands to run, only show real commands (cd, git, etc.) — never show example output blocks.

6. **The Linux sandbox (`mcp__workspace__bash`) is unreliable.** Often returns "Workspace unavailable." Don't rely on it for git operations — give the user the manual commands to run in their PowerShell.

---

## 📊 Current state · what's deployed

### Content (all live in production)
- **24 blog posts** (~36,500 words long-form) in `/blog/`
- **22 creator profiles** with Person/Organization schema in `/creator/`
- **5 collection pages** (geo + style): Taipei, Moscow, Colombia, Seoul, heels-choreo, cosplay-fancam, reggaeton-floor
- **4 legal/corporate**: `/about.html`, `/privacy.html`, `/terms.html`, `/contact.html`
- **2 utility**: `/search.html` (with in-memory 25-entry index), `/glossary.html` (30 DefinedTerm entries)
- **3-language i18n cluster**:
  - EN (default, all pages)
  - ES (`/es/index.html`, `/es/about.html`, `/es/contact.html`)
  - RU (`/ru/index.html`, `/ru/about.html`)
  - All with bidirectional `<link rel="alternate" hreflang>` cluster
- **5 playlist landing pages** (cosplay-fancam, korean, latina-model, try-on-haul, twerk-hub-leaks) + `/playlist/` index with 275 detail pages
- **3 sitemaps**: `/sitemap.xml` (main, ~120 URLs), `/sitemap-videos.xml`, `/sitemap-index.xml`

### Tech stack
- **Hosting**: Cloudflare Pages (auto-deploys on git push to main)
- **Service Worker**: `service-worker.js` — currently `v1.1.5`. Universal inject URL: `/assets/twerkhub-universal-inject.js?v=20260424-p10`
- **CSS layers** (loaded in order via universal-inject):
  1. `twerkhub-page.css` (canonical layout)
  2. `twerkhub-tokens.css`
  3. `twerkhub-polish.css`
  4. `twerkhub-premium.css`
  5. `twerkhub-design-tokens.css`
  6. `twerkhub-a11y.css` (a11y + kills legacy navs + cursor safety net)
  7. `twerkhub-elevation.css` (LEAN premium polish — read the comment block at the top before touching!)
- **JS layers** (deferred, loaded via universal-inject):
  1. `twerkhub-tokens.js`
  2. `twerkhub-topbar-enhance.js`
  3. `twerkhub-locale-switcher.js`
  4. `twerkhub-mobile-nav.js`
  5. `twerkhub-sound-on-interaction.js` (auto-unmute on first gesture armed)
  6. `twerkhub-premium.js` (scroll reveal + countup + viewed tracker — rootMargin expanded to `1500px` to prevent lazy-reveal of grids)
  7. `twerkhub-cursor.js` (DISABLED — kill-switch at top)
  8. `twerkhub-share.js` (social share bar on blog/legal/playlist pages, 6 networks)
  9. `twerkhub-vitals.js` (Core Web Vitals RUM beacon to `/api/vitals`)
- **Token economy**: 4 tiers — Basic (0-499) · Medium (500-1999) · Premium (2000-9999) · VIP Top (10000+). Localstorage `alexia_tokens_v1.balance`.
- **YouTube embed rule**: Always use `youtube.com/embed/` (NOT youtube-nocookie) + `enablejsapi=1` + `widget_referrer=https%3A%2F%2Falexiatwerkgroup.com` + `origin=https%3A%2F%2Falexiatwerkgroup.com`. Without those params, YouTube triggers a "Confirm you're not a bot" gate that blocks autoplay.

### SEO state
- **Estimated score: 9.8/10**
- Schema.org coverage: WebSite, Organization, Person×11, SoftwareApplication, AggregateRating, Product, Service, Offer, VideoObject, ImageObject, FAQPage, BreadcrumbList, BlogPosting (every post), HowTo (2 posts), DefinedTermSet, ContactPage, AboutPage, SearchResultsPage, SearchAction, CollectionPage
- robots.txt registers all 3 sitemaps
- All pages have canonical + hreflang cluster
- Google Tag Manager `G-YSFR7FHCLS` on home

### Performance state
- Hero (home page): autoplay muted, "Tap to unmute" button + auto-unmute on first user gesture (click/scroll/keypress)
- All thumbnails: `loading="eager"` on visible content (the 6 home playlist cards), inline MutationObserver on each playlist page forces eager-load on `.vthumb img / .rk-thumb img / .twerkhub-fp-thumb img`
- Multi-layer shadows (3 layers) on cards
- Glass topbar with `backdrop-filter: blur(20px)` (STATIC, not animated)
- View Transitions API enabled (`@view-transition { navigation: auto }`)
- Stagger entrance on first 6 playlist cards (one-time, 600ms total)
- Custom focus-visible rings (gold + 5px halo)
- Premium scrollbar (pink gradient)
- `prefers-reduced-motion` respected globally

---

## 🔥 What works · DO NOT TOUCH

- The hero player on home (`#twerkhub-hh-iframe`) — bot gate fixed, audio unmute working
- The 6 playlist cards on home — all thumbs visible, real OG images, eager loading
- The `/playlist/` 275-video grid — Google indexed, slugs stable, eager loading
- The 5 playlist leak pages (`playlist-cosplay-fancam-leaks`, `playlist-korean`, `playlist-try-on-haul-leaks`, `playlist-latina-model-leaks`) — TOP5 thumbs match real YouTube playlists, no duplicates, JSON-LD aligned
- Topbar SAGRADA (8 nav items) — universal-inject removes legacy `.alexia-global-nav` + `.twerkhub-pl-topbar` (2nd botonera that used to stack)
- Service Worker cache-first with stale-while-revalidate

---

## 🐛 Known quirks / things to watch

1. **The 4 most recent commit files** (`blog/discord-community-playbook.html`, `blog/the-4-tiers-explained.html`, `creator/befox-dance-studio.html`, `creator/kato-dance-studio.html`) appeared in `git status` outside of my (Claude's) creations during round 9. Either user added them manually or from a prior session. They're on-brand and live. Need to be added to the blog index + sitemap if not already.
2. **PowerShell paste errors** are common — user has pasted explanatory text 3+ times. Always remind them to only paste actual commands.
3. **Linux workspace MCP often unavailable** — fallback to manual user terminal.
4. **Bio-research / PDF-viewer MCP servers disconnect/reconnect frequently** — ignore those reminders, they're irrelevant.
5. **Cloudflare Pages deploy is automatic** on push to main. Takes ~60-120 seconds.

---

## 📝 Round-by-round history

| Round | Commit | Summary |
|---|---|---|
| Initial | (multiple) | Platform foundation, 7 playlists, token economy, topbar, etc. |
| ELEVATION | `d89a3cb` | Premium visual polish layer added (later stripped for perf) |
| 4 | `6e17d34` | /search.html, /glossary.html, video sitemap, 3 collection pages |
| (perf fix) | `901e7b4` | REMOVE magnetic cursor (lag) |
| (perf fix) | `9368634` | STRIP heavy GPU effects from elevation.css |
| 5 | `f19fe70` | +3 blog posts, +3 creator profiles (WanGong/Лада/Nika), +Colombia/Seoul/cosplay/reggaeton pages |
| 6 | `661cf6b` | +4 blog posts (MDC NRG/etiquette/token playbook/etc), +3 creators, +/es/ |
| 7 | `bf7acae` | +/ru/ locale, +3 posts (heels guide, 4K vs VR, no-algorithm), +3 creators (FOXYEN, Indica, Yana) |
| 8 | `d39d736` | +2 posts (BsAs scene, perreo history), +2 creators (Emiliano, Kadorin), +/es/about |
| 9 (mine) | `13857f6` | +2 posts (creator pitch, fancam pipeline), +/ru/about, +/es/contact |
| 9 (extra) | `2360798` | +2 posts (Discord playbook, 4-tiers explained), +2 creators (BEFOX, Kato) |
| 10 | `a6ea5ca` | 1-7 pickup: orphan cleanup + post #20 (founder essay) + 5 creators (VR KINGS, LABARBIE, Patricia Atakora, Sugaarrbbaby, Nika Chilli Odessa) + /es/glossary + /ru/contact + 2 translations (manifesto ES, MDC NRG history RU) + sitemap-videos 5→22 entries + new sitemap-images.xml. SW bumped to v1.1.6 / p11. |
| 11 | `a6ea5ca` | i18n cluster lockdown: +/ru/glossary.html (close trilingual glossary), +/es/blog/ + /ru/blog/ landing pages (parents for translated posts), +FAQPage schema on /about.html (7 Q&A) and /membership.html (7 Q&A · billing/refunds/tier mechanics), full trilingual hreflang on /glossary, /es/glossary, /blog/index. |
| 12 | `a6ea5ca` | Search i18n + 2nd ES manifesto translation + Service schema. +/es/search.html (28-entry index translated to ES) + /ru/search.html (28-entry RU). +/es/blog/why-twerkhub-has-no-algorithm-feed.html (companion to founder essay). +Service schema on /about.html (provider/audience/4-tier offers). Hreflang trilingüe en /search. |
| 13 | `edf9e29` | Post #21 + 3rd ES translation. +blog/studios-shaping-2026.html (1.820 words pillar · 6 studios w/ heavy internal linking to creator profiles + collection pages). +/es/blog/perreo-history-caribbean-origin.html (1.740-word ES translation of Caribbean perreo history pillar). Updated blog grids EN+ES, hreflang on perreo EN. Pushed in commit `edf9e29` (rounds 10-13 batched). |
| 14 | `a6ea5ca` | Post #22 + manifesto trilingual + 2 translations + style page ES + nav fix. +blog/afrobeats-twerk-crossover.html (1.690-word pillar · West African crossover · links to Patricia Atakora). +/ru/blog/why-i-built-twerkhub.html (closes trilingual founder essay EN/ES/RU). +/es/blog/k-dance-vs-reggaeton-twerk.html. +/es/style-reggaeton-floor.html (first ES style page). NAV FIX: `.twerkhub-nav a.active` no longer pink-purple gradient — subtle dark fill + gold underline. SW v1.1.6→v1.1.7, universal-inject p11→p12, page p13→p14, polish p4→p5, elevation p3→p4-LEAN. |
| 15 | `a6ea5ca` | Membership FAQ loop closure: 3 ES translations of the posts linked from the Service+FAQPage schemas on /membership.html and /about.html. +/es/blog/token-economy-playbook.html (1.680 words · 95% creator cut math). +/es/blog/the-4-tiers-explained.html (1.480 words · tier mechanics + dual paths). +/es/blog/discord-community-playbook.html (1.550 words · community design). All cross-linked from /es/blog/ grid. ES blog total: 8 posts. |
| 16 | `a6ea5ca` | Onboarding loop closure + Anel Li + share buttons: +/es/blog/how-to-earn-tokens-twerkhub.html (closes onboarding flow ES). +/es/blog/weekly-drop-calendar-2026.html (operacional ARG/CO). +/ru/blog/fancam-etiquette-2026.html (RU ethics). +/creator/anel-li.html (Greece · Greek-Latin reggaetón fusion · referenced from style-reggaeton-floor EN+ES, now linked). +Facebook + Threads share buttons in twerkhub-share.js (5→7 networks + copy = 8 total). share VER p1→p2. Style-reggaeton-floor cards #4 ahora `<a>` con link al profile. ES blog total: 10 posts · creators total: 19. |
| 17 | `a6ea5ca` | Moscow profile gap closure + ES style cluster: +/creator/kate-knaub.html (Moscow independent · Goody Брокколи). +/creator/dasha-kolesnikova.html (Ufa regional rooftop · Nicki Minaj Yikes). +/creator/street-project-volzhsky.html (Volzhsky studio · Organization schema · Jazz-funk Kids program). +/es/style-heels-choreo.html. +/es/style-cosplay-fancam.html (closes 3-style ES cluster). creators-moscow.html cards #3-5 ahora linkean a profiles canónicos en /creator/ (no más placeholders a /playlist/). Creators total: 22. ES style pages: 3/3 completas. |
| 18 | `a6ea5ca` | Schema parity ES/RU + 2 ES translations. /es/about.html y /ru/about.html ahora con Service + FAQPage schemas (parity con /about.html EN · 7 Q&A traducidas + 4 Offers por tier). +/es/blog/best-twerk-creators-2026.html (1.800 palabras · 12 creators con linkeo directo a profiles). +/es/blog/fancam-to-choreography-pipeline.html (1.420 palabras · 4-stage industry loop). ES blog total: 12 posts. |
| 19 | `a6ea5ca` | 2 nuevos pillars + comparación ES. +blog/brazilian-funk-twerk-crossover.html (post #23 · 1.740 palabras · cierra la 4ta escuela mayor: K-dance + reggaetón + Afrobeats + funk). +blog/black-sea-dance-scene.html (post #24 · 1.610 palabras · primer deep-dive de la escena costera Odessa/Sochi/Constanța · linkea Nika Chilli). +/es/blog/twerkhub-vs-onlyfans-fanvue-comparison.html (1.750 palabras). EN blog total: 24 posts · ES blog total: 13 posts. |
| 20 | _pending push_ | 3 traducciones que cierran clusters · technical + culture + tutorial. +/es/blog/4k-vs-1080p-vs-vr-fancam.html (1.390 palabras técnicas). +/es/blog/what-is-a-fancam-history.html (1.600 palabras · 5 eras del fancam, complementa perreo history). +/ru/blog/heels-choreo-beginner-guide.html (1.580 palabras · HowTo schema preservado · pair natural con MDC NRG history RU para audiencia rusa nativa). ES blog total: 16 posts · RU blog total: 4 posts. |
| 21 | _pending push_ | Los 3 pillars culturales recientes a ES. +/es/blog/afrobeats-twerk-crossover.html (1.690 palabras · West African crossover). +/es/blog/brazilian-funk-twerk-crossover.html (1.740 palabras · 4ta escuela mayor). +/es/blog/studios-shaping-2026.html (1.820 palabras · industry pillar con linkeo pesado a creator profiles). ES blog total: 19 posts (cubre 79% del catálogo EN). Las 4 escuelas mayores ahora documentadas trilingüe en EN+ES. |
| 22 | _pending push_ | Cierre del catálogo ES. +/es/blog/buenos-aires-reggaeton-scene-2026.html (1.520 palabras · audiencia local nativa AR). +/es/blog/how-to-pitch-twerkhub-creator.html (1.460 palabras · HowTo schema · creators hispanohablantes). +/es/blog/black-sea-dance-scene.html (1.610 palabras · cierre del pillar regional). ES blog total: 22 posts (cubre 92% del catálogo EN · solo queda moscow-dance-centre-nrg-history sin traducir a ES y ya está en RU). |
| 23 | _pending push_ | Expansión RU · 3 estratégicos. +/ru/blog/token-economy-playbook.html (1.680 palabras · cierra membership FAQPage loop en RU). +/ru/blog/the-4-tiers-explained.html (1.480 palabras · mecánica de tiers). +/ru/blog/studios-shaping-2026.html (1.820 palabras · MDC NRG es Moscú · super relevante audiencia rusa). RU blog total: 7 posts (de 4) · hreflang trilingüe completo en token + 4-tiers + studios. |
| 24 | _pending push_ | RU profundización · 3 más. +/ru/blog/why-twerkhub-has-no-algorithm-feed.html (1.480 palabras · cierra manifesto trilingüe). +/ru/blog/k-dance-vs-reggaeton-twerk.html (1.620 palabras · pillar cultural · K-dance super relevante RU). +/ru/blog/best-twerk-creators-2026.html (1.800 palabras · linkea profiles directos). RU blog total: 10 posts. Hreflang trilingüe completo en los 6 traducidos a RU. |
| 25 | _pending push_ | RU pillars culturales · las 3 escuelas extra. +/ru/blog/afrobeats-twerk-crossover.html (1.690 palabras · West African crossover, Tyla momentum). +/ru/blog/brazilian-funk-twerk-crossover.html (1.740 palabras · 4ta escuela mayor, Anitta inflection). +/ru/blog/perreo-history-caribbean-origin.html (1.740 palabras · Caribbean pillar). RU blog total: 13 posts. Las 4 escuelas mayores + perreo history ahora trilingüe completo EN+ES+RU. |
| 26 | _pending push_ | RU cierre estratégico · platform + community + onboarding. +/ru/blog/twerkhub-vs-onlyfans-fanvue-comparison.html (1.750 palabras · comparación trilingüe completa). +/ru/blog/discord-community-playbook.html (1.550 palabras · cierra el plays + community + ritual loop en RU). +/ru/blog/how-to-earn-tokens-twerkhub.html (1.520 palabras · onboarding flow trilingüe completo · Basic→VIP path). RU blog total: 16 posts (cubre 67% del catálogo EN). Hreflang `ru` agregado a EN+ES sources de los 3 traducidos. ES coverage: 22/24 · RU coverage: 16/24. |
| 27 | _pending push_ | RU cluster fancam técnico/histórico + dropd calendar. +/ru/blog/what-is-a-fancam-history.html (1.600 palabras · 25-year fancam history pillar · 5 eras desde K-pop 2000 a cosplay-twerk 2026). +/ru/blog/4k-vs-1080p-vs-vr-fancam.html (1.390 palabras · technical comparison · cierra el cluster fancam técnico EN+ES+RU). +/ru/blog/weekly-drop-calendar-2026.html (1.420 palabras · operacional con timezone tabla incluyendo Moscú · drop times across 9 cities). RU blog total: 19 posts (cubre 79% del catálogo EN). Hreflang `ru` agregado a las 3 fuentes EN+ES. Sólo 5 posts EN sin RU restantes. |
| 28 | _pending push_ | **RU 100% coverage achieved** — los últimos 4 posts traducidos. +/ru/blog/black-sea-dance-scene.html (1.610 palabras · regional pillar · Odessa/Sochi/Constanța · super relevante audiencia rusa nativa). +/ru/blog/fancam-to-choreography-pipeline.html (1.420 palabras · industry creative loop · cierra el cluster industria fancam). +/ru/blog/buenos-aires-reggaeton-scene-2026.html (1.520 palabras · BsAs origin scene). +/ru/blog/how-to-pitch-twerkhub-creator.html (1.460 palabras · HowTo schema · cierra el cluster onboarding/creator-recruitment). RU blog total: 23 posts (cubre 100% del catálogo de pillar/canonical EN · solo `fancam-etiquette-2026` y otros menores quedaron como standalone canonical). Hreflang `ru` agregado a 4 fuentes EN+4 fuentes ES. ES coverage: 22/24 · RU coverage: 23/24 · trilingüe completo en TODOS los pillars críticos. |

---

## 🚀 Pending / next-step candidates

### Easy wins (zero risk)
- [ ] Add the 4 ROUND-9-extra files to `blog/index.html` and `sitemap.xml` (they're not in those indexes yet)
- [ ] One more blog post to round out from 19 → 20 (original goal)
- [ ] `/es/glossary.html` and `/ru/contact.html` to deepen i18n cluster
- [ ] Expand video sitemap from 5 to 30+ entries (need to map more video IDs to URLs)

### Medium wins
- [ ] More creator profiles: VR KINGS, Nika Chilli (Odessa), LABARBIE, Patricia Atakora, Sugaarrbbaby
- [ ] Translate 1-2 blog posts to ES/RU (start with the manifesto + Moscow history)
- [ ] FAQ schema on About + Membership pages
- [ ] Image sitemap (separate from video sitemap)

### Larger projects (don't do without explicit user OK)
- [ ] Cloudflare Worker for `/api/vitals` real receiver → D1 database
- [ ] WebSocket "online now" counter (currently random JS sim)
- [ ] Pre-computed blur-up placeholders (base64 20x20)
- [ ] Pinterest + TikTok share widgets (currently 6 networks, could add 2)
- [ ] Real-time creator dashboard for the platform itself

---

## 🛠️ Standard operations

### Deploy a change
```
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean
git add .
git commit -m "DESCRIPTION HERE"
git push origin main
```
Cloudflare auto-deploys in 1-2 min. User then does `Ctrl+Shift+R` for hard reload (because of Service Worker).

### Bump Service Worker version (forces SW refresh)
Edit `service-worker.js`:
```js
const CACHE_NAME = 'alexia-pwa-vX.X.X';
const RUNTIME_CACHE = 'alexia-runtime-vX.X.X';
const UNIVERSAL_INJECT_URL = '/assets/twerkhub-universal-inject.js?v=20260424-pXX';
```

### Bump asset version (forces single-asset refresh)
Edit `assets/twerkhub-universal-inject.js` VER object near top:
```js
var VER = { tokens:'...', polish:'...', a11y:'...', elevation:'...', ... };
```
Then bump VER for whatever asset you changed.

### Add a new blog post
1. Create `blog/<slug>.html` using existing post as template (e.g. `blog/how-to-earn-tokens-twerkhub.html`)
2. Include: BlogPosting schema + BreadcrumbList + canonical + hreflang + author=Person=Anti
3. Add card entry to `blog/index.html` grid
4. Add `<url>` entry to `sitemap.xml`
5. Cross-link from related existing posts

### Add a new creator profile
1. Create `creator/<slug>.html` using existing profile as template (e.g. `creator/wangong-lin.html`)
2. Include: Person schema with jobTitle, affiliation, nationality, knowsAbout
3. BreadcrumbList 4-level (Home → Creators → City → Name)
4. Add link from relevant `creators-<city>.html` collection page
5. Add `<url>` to sitemap

---

## 📂 Repo structure snapshot

```
alexia-twerk-web-clean/
├── index.html                   # Home (EN, default)
├── about.html, privacy.html, terms.html, contact.html
├── search.html, glossary.html
├── es/
│   ├── index.html, about.html, contact.html
├── ru/
│   ├── index.html, about.html
├── blog/
│   ├── index.html               # Blog listing
│   └── *.html                   # 19 posts
├── creator/
│   └── *.html                   # 13 individual creator profiles
├── playlist/
│   ├── index.html               # 275-video grid (DON'T BREAK)
│   └── *.html                   # 640 detail pages (DON'T BREAK)
├── playlist-korean.html
├── playlist-cosplay-fancam-leaks.html
├── playlist-try-on-haul-leaks.html
├── playlist-latina-model-leaks.html
├── playlist-twerk-hub-leaks.html
├── creators-taipei.html, creators-moscow.html, creators-colombia.html, creators-seoul.html
├── style-heels-choreo.html, style-cosplay-fancam.html, style-reggaeton-floor.html
├── community.html, account.html, profile.html, membership.html
├── alexia-video-packs.html (Hot Packs)
├── sitemap.xml, sitemap-videos.xml, sitemap-index.xml
├── robots.txt
├── service-worker.js            # PWA SW · v1.1.5
├── manifest.json
├── assets/
│   ├── twerkhub-page.css        # Canonical layout
│   ├── twerkhub-tokens.css      # Token HUD styles
│   ├── twerkhub-polish.css
│   ├── twerkhub-premium.css     # Reveal stagger + count-up + cards
│   ├── twerkhub-design-tokens.css
│   ├── twerkhub-a11y.css        # A11y + kill legacy navs
│   ├── twerkhub-elevation.css   # LEAN premium polish · DON'T BREAK
│   ├── twerkhub-universal-inject.js   # SW-injected loader
│   ├── twerkhub-tokens.js
│   ├── twerkhub-topbar-enhance.js
│   ├── twerkhub-locale-switcher.js
│   ├── twerkhub-mobile-nav.js
│   ├── twerkhub-sound-on-interaction.js
│   ├── twerkhub-premium.js
│   ├── twerkhub-cursor.js       # DISABLED (kill-switch)
│   ├── twerkhub-share.js
│   ├── twerkhub-vitals.js
│   ├── twerkhub-paywall.js      # Has /playlist/* killswitch
│   ├── twerkhub-playlist-renderer.js
│   ├── twerkhub-auth.js
│   ├── twerkhub-auth-patch.js
│   ├── token-system.js
│   ├── global-brand.js
│   ├── alexia-unify.js          # Legacy 2023 — purge selectors include .alexia-global-nav
│   ├── page-performance-guard.js  # Skip-list for .vthumb img / .rk-thumb img
│   └── ...
└── HANDOFF-COWORK.md            # ← this file
```

---

## 💬 User communication style

- **Speaks Argentine Spanish.** Casual, direct, drops connectors, uses "vos" form.
- **Email**: alexiatwerkoficial@gmail.com
- **Display name in chat**: Anti
- **Role**: founder + platform architect (firestarter)
- Often gives one-word commands: "segui" (continue), "ok", "dale", "si"
- Sometimes pastes long terminal errors when confused → don't take them as bug reports automatically; check whether they actually pasted explanatory text into PowerShell
- Wants speed, doesn't want over-explaining
- Cares deeply about: zero performance regressions, real curation quality, brand voice consistency, the 4-tier token economy story
- **Brand voice rules**:
  - Lowercase first word in headings often (e.g., "the platform for the uncut ones")
  - Em-dashes — used liberally for emphasis
  - Argentine flavor: "vos", "che", "dale", "boludo" (only in chat, never in product copy)
  - Product copy: lean, declarative, never marketing-speak
  - Numbers: tabular, exact (e.g., "2,178 members" not "thousands of members")
  - Avoid: "amazing", "incredible", "world-class", any superlative
  - Use: precise nouns, short verbs, specific names
  - Tag line: "If you know, you know."

---

## 🌐 Project context · PUBLIC (safe to commit)

### Domain + repo
- **Production**: https://alexiatwerkgroup.com/
- **GitHub repo**: https://github.com/alexiatwerkgroup/alexia-twerk-web-clean
- **GitHub user**: alexiatwerkgroup
- **Hosting**: Cloudflare Pages (auto-deploy on push to `main` branch)
- **CDN**: Cloudflare global
- **Working dir**: `C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean`
- **OneDrive sync**: Active (so files sync to cloud — be aware some operations may have brief delays)

### Public emails (declared in `/contact.html` + ContactPage schema)
- **Support**: support@alexiatwerkgroup.com
- **Billing**: billing@alexiatwerkgroup.com
- **DMCA / takedowns**: dmca@alexiatwerkgroup.com
- **Press / media**: press@alexiatwerkgroup.com
- **Privacy / GDPR / LGPD**: privacy@alexiatwerkgroup.com
- **Creator pitches**: creators@alexiatwerkgroup.com
- **Legal**: legal@alexiatwerkgroup.com
- SLA: 72h response. URGENT subject = 24h.

### Public social channels (in footer + Organization sameAs schema)
- **X / Twitter**: @alexiatwerkofic — https://x.com/alexiatwerkofic
- **YouTube channel**: @alexiatwerkoficial — https://www.youtube.com/@alexiatwerkoficial
- **OnlyFans**: alexiatwerkoficial — https://onlyfans.com/alexiatwerkoficial
- **Instagram**: @alexiatwerkoficial — https://instagram.com/alexiatwerkoficial
- **Discord (members lounge)**: https://discord.gg/WWn8ZgQMjn
- **Telegram**: https://t.me/+0xNr69raiIlmYWRh
- **Patreon**: Alexia_Twerk — https://www.patreon.com/Alexia_Twerk

### Founders (declared via Person schema on /about + index)
- **Alexia** — alternate name "Alexia Twerk Oficial" — Founder + Lead Creator + Curator
- **Anti** — alternate name "firestarter" — Founder + Platform Architect (this is the user)
- **Founded**: 2018 in Buenos Aires, Argentina
- **Reg location**: Argentina

### Key creators in archive (with profile pages)
1. **WanGong Lin 林碗公** (Taipei, iDance Studio) → `/creator/wangong-lin.html` · video ID `Ba8udR5zP3g`
2. **Лада Гоцци** (Moscow, MDC NRG) → `/creator/lada-gozzi.html` · video ID `X-lPzSuvf3k`
3. **Nika Chill** (LA) → `/creator/nika-chill.html` · video ID `HxThOzMTdmg`
4. **Angela** (Taipei, iDance) → `/creator/angela-idance.html` · video ID `EX8pMpkLDYI`
5. **FOXYEN** (Taipei, iDance) → `/creator/foxyen.html` · video ID `6aoJbhxfOn4`
6. **Yurgenis · YUR AULAR** (Caracas → Medellín) → `/creator/yurgenis.html` · video ID `GSeYEJ3qIxU`
7. **Debii Abreu** (DR + Medellín) → `/creator/debii-abreu.html` · video ID `k68KXBiflR8`
8. **Lena Indica** (Russia, Indica team) → `/creator/lena-indica.html` · video ID `nIkHv5p6bAU`
9. **Abasheva Yana** (Russia, TWERKIT Studio) → `/creator/abasheva-yana.html` · video ID `rJQedlVdCCU`
10. **Emiliano Ferrari Villalobo** (Zárate Argentina, Dance is Convey) → `/creator/emiliano-ferrari-villalobo.html` · video ID `Ye-jOmIomn4`
11. **Kadorin Hitomi** (Thailand) → `/creator/kadorin-hitomi.html` · video ID `cJfDUDYaWYo`
12. **Kato Dance Studio** → `/creator/kato-dance-studio.html` · video IDs `3D71UgdBwI0`, `Fb3CVNh5tfo`
13. **BEFOX Dance Studio** (Korea) → `/creator/befox-dance-studio.html` · video ID `Kj9T74htwrA`

### Key playlist video IDs (top of each playlist · DO NOT CHANGE without re-fetching real YouTube data)
- **/playlist/** main archive — TOP5: `X-lPzSuvf3k`, `8yAG7toqnCM`, `HxThOzMTdmg`, `rJQedlVdCCU`, `3D71UgdBwI0`
- **playlist-cosplay-fancam-leaks** — TOP5: `qoho-dzADrc`, `wLWDZQmzPOY`, `U0-_hknfcqE`, `cJfDUDYaWYo`, `GEVxQV9kuVE`
- **playlist-korean** — TOP5: `Ba8udR5zP3g`, `bmL9kEfYtjA`, `6aoJbhxfOn4`, `EX8pMpkLDYI`, `iybt52yxGd8`
- **playlist-try-on-haul-leaks** — TOP5: `vpF6oGPZf1s`, `X-lPzSuvf3k`, `jV43SVvpkso`, `Kj9T74htwrA`, `k68KXBiflR8`
- **YouTube playlist source** for cosplay-fancam: `PLMzWifnZnpVLt_Epf5QNFIBw146T_Ui7j` (Twerk Playlist #1 from 1 to 275)
- **Hero video on home (index.html)**: `XDkH0yaocJ8`

### Brand identity
- **Primary brand color (pink)**: `#ff2d87`
- **Secondary (purple)**: `#9d4edd`
- **Accent (gold)**: `#ffb454`
- **Live status (green)**: `#1ee08f`
- **Background dark**: `#05050a`
- **Body text light**: `#f5f5fb`
- **Muted text**: `#c7c7d4`
- **Brand gradient (signature)**: `linear-gradient(135deg, #ff2d87 0%, #ffb454 100%)`
- **VIP gradient (gold)**: `linear-gradient(135deg, #1ee08f, #ffb454)`

### Font stack
- **Display / serif**: Playfair Display 700/800/900 (italic + roman) · Google Fonts
- **UI / body sans**: Inter 400/500/600/700/800/900 · Google Fonts
- **Mono / kicker**: JetBrains Mono 500/700 · Google Fonts
- Preload Playfair Display 700 woff2: `https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDQpA.woff2`

### Token economy
- **Basic**: 0–499 tokens · $0/mo · Free previews + hot ranking
- **Medium**: 500–1,999 tokens · $9.99/mo · Early drops + Discord lounge
- **Premium**: 2,000–9,999 tokens · $29.99/mo · Full archive (1,500+ videos)
- **VIP Top**: 10,000+ tokens · $99.99/mo · Custom content + direct Alexia line
- **Token earning rules**: +5/page-explore (max 50/day) · +15/clip-watch (max 300/day) · +30/clip-finish · +50/daily-login · streak bonuses Day 7=200, Day 14=400, Day 30=1000 · +500/referral
- **localStorage key**: `alexia_tokens_v1.balance` (legacy: `twerkhub_tokens`)

### Drop schedule
- **Frequency**: Weekly
- **Day**: Thursday
- **Time**: 00:00 ART (Argentina Time, UTC-3)
- **First-100 bonus**: +100 tokens for first 100 members to open within 60min
- **Preview window**: Medium tier sees thumbs + 15s preview from Wednesday 12:00 ART. Premium gets full 48h early. VIP Top gets 72h early.

### Third-party services in use
- **Cloudflare Pages** — hosting
- **Cloudflare CDN** — global delivery
- **Google Tag Manager** — `G-YSFR7FHCLS` (declared in index.html)
- **Google Fonts** — Playfair Display + Inter + JetBrains Mono
- **YouTube embed** — every video iframe uses `youtube.com/embed/` (not nocookie)
- **YouTube Atom feeds** — used for fetching real playlist data (e.g., `/feeds/videos.xml?playlist_id=PLMzWifnZnpVJ7sAR9STyDXbTjd3x0ITmR`)
- **Discord** — community lounge
- **Stripe** — declared as billing processor in `/terms.html` (subscription billing). User has Stripe account, secrets are LOCAL (see SECRETS-LOCAL.md template).

### Sister / linked properties (declared via Organization sameAs)
- **Alexia OnlyFans**: alexiatwerkoficial
- **Alexia YouTube channel**: @alexiatwerkoficial
- **The Wild Project Models Agency** (mentioned in footer)

---

## 🔐 Credentials handling · READ THIS

**RULE: Never put real passwords/API keys/tokens in any file that gets committed.**

The repo is on public GitHub. Anything committed = visible forever, even if you `git rm` later (it stays in history). Bots scrape GitHub 24/7 looking for leaked Stripe keys, AWS keys, Discord tokens, GitHub PATs, etc.

### Where credentials should live (NOT in this repo)
- **Cloudflare Pages dashboard** → Environment variables (set in CF dashboard, available at build/runtime)
- **`.env.local`** in working dir (must be in `.gitignore` — already added)
- **`SECRETS-LOCAL.md`** in working dir (also in `.gitignore` — template provided in that file)
- **Password manager** (1Password / Bitwarden / etc.) for personal credentials

### What lives where (without exposing values)
- **GitHub Personal Access Token** for git push: stored in Windows Credential Manager (set up by `git config --global credential.helper`)
- **Stripe secret key + publishable key**: Cloudflare Pages env vars (when payment integration ships)
- **Cloudflare API token** (for SW deploys): user's local CLI config or CF dashboard
- **Email passwords** (support@, billing@, etc.): user's password manager
- **Discord bot tokens** (if any bots exist): user's local config
- **G-YSFR7FHCLS** (Google Analytics ID): this is PUBLIC, declared in HTML — not a secret

### If you (next agent) need a credential to do work
1. Check `SECRETS-LOCAL.md` first (user fills in their local copy)
2. If not there, ask the user explicitly: "Necesito X para hacer Y. ¿Me lo pasas en chat o lo pongo en SECRETS-LOCAL.md?"
3. NEVER hardcode a credential in any committed file
4. NEVER ask the user to paste a credential into terminal echo / git commit message / etc.

---

## ✅ Verification checklist for new agent

Before doing anything, confirm:
1. Read this file fully
2. Read `assets/twerkhub-elevation.css` comment block at the top (explains what was killed and why)
3. Read `assets/twerkhub-cursor.js` comment block (kill-switch explanation)
4. Read `assets/twerkhub-paywall.js` lines 23-65 (kill-switch for /playlist/ pages)
5. Look at `git log --oneline -15` to see recent rounds
6. Run `git status` to see if anything is uncommitted

If user asks for a graphic/visual upgrade: BE EXTREMELY CONSERVATIVE. We've already crashed twice with cursor + aurora. Use only composited properties (transform, opacity, box-shadow on hover only). Test on a low-end machine mentally before shipping.

If user asks for more SEO content: low risk, ship aggressively. Pattern is clear from the 19 existing blog posts and 13 creator profiles.

---

## 🎬 Pickup script for new session

User will likely open new Cowork and say something like "seguir" or "donde quedamos". Respond with:

> Acabás de cerrar la ronda 9 — 19 blog posts, 13 creator profiles, 3 locales activos, ~120 URLs indexables. Plataforma SEO 9.8/10. Performance estable después de 2 rollbacks (cursor + aurora). Leí el HANDOFF-COWORK.md. ¿Qué seguimos?
>
> Opciones rápidas:
> 1. 1 post final para llegar a 20 (el goal original)
> 2. Agregar los 4 archivos huérfanos al blog index + sitemap
> 3. Más creator profiles (VR KINGS, LABARBIE, Patricia Atakora, Sugaarrbbaby)
> 4. /es/glossary.html + /ru/contact.html
> 5. Algo nuevo que tengas en mente

End of handoff.
