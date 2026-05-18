# i18n rules — TWERKHUB (KO/JA cluster, source-of-truth)

This is the playbook for adding Korean (KO) and Japanese (JA) versions of any playlist HOME or detail page. Validated against `/ko/hottest-cosplay-fancam/`, `/ja/hottest-cosplay-fancam/`, `/ko/korean-girls-kpop-twerk/`, `/ja/korean-girls-kpop-twerk/` — confirmed working in production April 2026.

## When to localize

Only generate KO/JA versions for content with **natural audience overlap** in those markets. The two playlists that qualify today:

| Playlist | Audiencia natural |
|----------|-------------------|
| `/hottest-cosplay-fancam/` | JP origen (Comiket, Akihabara) + KR consumidor |
| `/korean-girls-kpop-twerk/` | KR origen + JP audiencia K-pop |

**Do NOT localize** Latin model playlists, generic twerk-hub-leaks, or English-only blogs/creators to KO/JA. The signal-to-noise ratio is too low.

## Folder structure (mandatory)

```
/{lang}/{playlist-slug}/index.html
```

Examples (the 4 working in production):
- `ko/hottest-cosplay-fancam/index.html`
- `ja/hottest-cosplay-fancam/index.html`
- `ko/korean-girls-kpop-twerk/index.html`
- `ja/korean-girls-kpop-twerk/index.html`

For detail pages (future scaling): `/{lang}/{playlist-slug}/{video-slug}.html`

## Translation strategy (Strategy B — humanized, not raw machine)

**Rule:** never paste raw Google Translate output. Use native idioms.

| Element | KO (Korean) | JA (Japanese) |
|---------|-------------|---------------|
| Fancam | 직캠 (jikkam) — NOT トランスリ from English | ファンカム or 撮影会 (depends on context) |
| Cosplay | 코스플레이 | コスプレ |
| Choreography | 안무 | 振付 |
| Members only | 멤버 전용 | 会員限定 |
| Exclusive | 독점 | 独占 |
| Top 5 / Hot ranking | 핫 랭킹 | ホットランキング |
| Locked content | 잠긴 콘텐츠 / +18 잠금 | ロックコンテンツ / +18ロック |

The 4 production HOMEs use these terms — replicate them when extending to detail pages.

## Required head tags (every localized page)

```html
<html lang="ko">  <!-- or "ja" -->
<head>
  <title>{translated title} · TWERKHUB</title>
  <meta name="description" content="{translated meta description}"/>
  <link rel="canonical" href="https://alexiatwerkgroup.com/ko/{playlist-slug}/"/>

  <!-- 4-way hreflang cluster — REQUIRED on every i18n page AND on the EN original (bidirectional) -->
  <link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/{playlist-slug}/"/>
  <link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/{playlist-slug}/"/>
  <link rel="alternate" hreflang="ko" href="https://alexiatwerkgroup.com/ko/{playlist-slug}/"/>
  <link rel="alternate" hreflang="ja" href="https://alexiatwerkgroup.com/ja/{playlist-slug}/"/>

  <meta property="og:locale" content="ko_KR"/>  <!-- or ja_JP -->
  <meta property="og:title" content="{translated title}"/>
  <meta property="og:description" content="{translated meta description}"/>
  <meta name="twitter:title" content="{translated title}"/>
  <meta name="twitter:description" content="{translated meta description}"/>
</head>
```

**The bidirectional cluster is critical.** When you add `/ko/foo/`, you MUST also patch the existing EN `/foo/` to add the 4-way cluster pointing at the new KO version. Otherwise Google won't recognize the relationship.

## Required body changes per language

1. **H1**: translate native idiomatic — not literal
2. **Kicker** (`.twerkhub-pl-kicker`): translate
3. **Intro paragraph** (`.twerkhub-pl-intro`): translate
4. **JSON-LD CollectionPage** `name`, `description`, `inLanguage` — must reflect target language
5. **Footer "Other playlists / Keep going" section** — translated cards (kicker + title + sub per playlist) + translated CTA buttons (Discord, Telegram). Exclude the playlist itself from the cards.

## What stays in EN (DO NOT translate)

- Video IDs and YouTube embed URLs
- Class names, JS variable names
- Discord URL, Telegram URL
- The actual paywall scripts (`twerkhub-auth.js`, `twerkhub-age-gate.js`, `twerkhub-paywall.js`)
- GA4 ID `G-YSFR7FHCLS`
- Image SEO Engine reference

## Sitemap entry pattern (with xhtml:link cluster)

```xml
<url>
  <loc>https://alexiatwerkgroup.com/ko/{playlist-slug}/</loc>
  <lastmod>2026-04-28</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://alexiatwerkgroup.com/{playlist-slug}/"/>
  <xhtml:link rel="alternate" hreflang="en" href="https://alexiatwerkgroup.com/{playlist-slug}/"/>
  <xhtml:link rel="alternate" hreflang="ko" href="https://alexiatwerkgroup.com/ko/{playlist-slug}/"/>
  <xhtml:link rel="alternate" hreflang="ja" href="https://alexiatwerkgroup.com/ja/{playlist-slug}/"/>
</url>
```

The `<urlset>` element needs `xmlns:xhtml="http://www.w3.org/1999/xhtml"` (already present in the current sitemap).

## Generation algorithm (when extending or updating a playlist)

```python
# 1. Read EN HOME as template
with open(f'{slug}/index.html') as f: en_html = f.read()

# 2. For each language (ko, ja):
for lang in ['ko', 'ja']:
    page = en_html

    # 3. Replace <html lang="en"> with target lang
    page = re.sub(r'<html lang="[^"]*"', f'<html lang="{lang}"', page, count=1)

    # 4. Replace canonical URL
    page = page.replace(f'https://alexiatwerkgroup.com/{slug}/',
                        f'https://alexiatwerkgroup.com/{lang}/{slug}/')

    # 5. Strip existing hreflang alternates and inject the new 4-way cluster
    page = re.sub(r'<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>\s*', '', page)
    # then insert after canonical link

    # 6. Translate <title>, <meta description>, og/twitter, og:locale
    # 7. Translate H1, kicker, intro, JSON-LD CollectionPage strings
    # 8. Replace the inherited 'Other playlists' footer with the translated version (excluding self)

    with open(f'{lang}/{slug}/index.html', 'w') as f: f.write(page)

# 9. Patch the EN HOME to add hreflang back-references (bidirectional cluster)
# 10. Update sitemap.xml + add the 2 new URLs with xhtml:link annotations
```

## Validation after generation

```bash
node scripts/validate-pages.js   # must say All N pages valid (count grows by N localized files)
node scripts/check-encoding.js   # KO/JA pages must be clean UTF-8
```

The validator already enforces:
- GA4 snippet (skips if isUtilityPage but i18n pages don't match utility patterns)
- image-seo-engine.js script tag
- Encoding (no mojibake, no BOM)

## Deploy gotcha (CRITICAL — learned the hard way April 2026)

Cloudflare Pages may **silently skip new top-level directories** on the first deploy after creation. Symptom: file is in git tree, but production returns 404 forever.

**Fix:** after pushing the i18n batch, push a follow-up trivial commit (e.g. touch a `_deploy-trigger.txt`) to force a fresh deployment. The new directories appear after the second deploy.

## Future scaling (when the pilot proves itself)

If GSC shows ≥50 monthly impressions per market in 30 days for the 4 piloted HOMEs, scale to detail pages:

| Playlist | Detail pages per language | Total adds |
|----------|---------------------------|------------|
| `/hottest-cosplay-fancam/` | 60 → KO + JA = 120 | +120 |
| `/korean-girls-kpop-twerk/` | 50 → KO + JA = 100 | +100 |
| **Total** | | **+220 URLs** |

Use the same 4-way cluster for each detail page. Discount by 30% if traffic doesn't materialize — only generate the top 20 most-clicked videos per playlist instead of all 60+50.

## Reference: working examples in production

Verified live April 28, 2026 (HTTP 200 confirmed):
- ✅ https://alexiatwerkgroup.com/ko/hottest-cosplay-fancam/
- ✅ https://alexiatwerkgroup.com/ja/hottest-cosplay-fancam/
- ✅ https://alexiatwerkgroup.com/ko/korean-girls-kpop-twerk/
- ✅ https://alexiatwerkgroup.com/ja/korean-girls-kpop-twerk/

Each has: hreflang cluster (4 entries), translated title + meta + h1 + intro + footer + CTA buttons + JSON-LD CollectionPage, paywall stack inherited from EN model, GA4 + image-seo-engine + tracking scripts, sitemap entry with xhtml:link annotations.

## When NOT to use this guide

- Don't localize if the content is creator-specific to a region that doesn't speak the target language (e.g. Latin model leaks → KO has no audience)
- Don't translate playlist HOMEs without adding the EN hreflang back-reference (Google ignores one-way clusters)
- Don't use raw machine-translated text — Google Translate output flagged as "thin translated content" and blocked from indexing
