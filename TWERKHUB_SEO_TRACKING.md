# TWERKHUB · SEO recovery tracking

**Objetivo**: monitorear si los fixes de hoy sacan a `/playlist/` de la cola
"Crawled - currently not indexed" y si el sitio recupera tráfico post-drop del
6-7 junio 2026.

**Fixes deployados el 2026-07-01** (commits en `main`):

- `8300f4bf3` — SEO cleanup (1916 archivos): removido widget LiveJasmin, rating=adult,
  isFamilyFriendly:false, referencias `alexiatwerkgroup.com`
- `3e2b68db4` — SEO enrichment de `/playlist/`: 1051 palabras, 1 H2 + 5 H3 en `<details>`,
  6 links internos naturales, title y meta description mejorados
- `6cadc21a7` — Sitemap fix: agregado `/` y `/playlist/` como URLs raíz + reparación
  del XML truncado

**URL principal a monitorear**: `https://twerkhub.lat/playlist/`

---

## Baseline (hoy, 2026-07-01)

| Signal | Estado |
|---|---|
| URL Inspection status | "URL is not on Google" |
| Page indexing | "Crawled - currently not indexed" |
| Discovery · Sitemaps | "No referring sitemaps detected" (cache pre-fix) |
| Discovery · Referring page | "None detected" (cache pre-fix) |
| Last crawl (Google) | 2026-07-01 08:44 AM (pre-fix) |
| User-declared canonical | `https://twerkhub.lat/playlist/` |
| Google-selected canonical | Inspected URL (respeta el canonical) |
| GSC Sitemaps panel | `sitemap.xml` = Success · 846 pages |
| Total indexed pages (GSC Pages report) | _completar_ |

---

## Checkpoints programados

Copiá el bloque de la fecha, chequeá en GSC y llenalo. Si algo cambia, notalo abajo.

### 📅 Día +2 (2026-07-03)

- [ ] URL Inspection `/playlist/` → **Status**: _____________________________
- [ ] URL Inspection `/playlist/` → **Discovery · Sitemaps**: _______________
- [ ] URL Inspection `/playlist/` → **Discovery · Referring page**: _________
- [ ] URL Inspection `/playlist/` → **Last crawl**: _________________________
- [ ] Sitemap panel → `sitemap-index.xml` Discovered pages: _________________
- [ ] Performance report → filtro Page = `/playlist/` → **Impressions 7d**: _
- [ ] Bug "Something went wrong" en Test Live: [Sí / No]
- [ ] Si el Test Live funciona → **Request Indexing** ← primer intento

**Notas**:
```

```

### 📅 Día +7 (2026-07-08)

- [ ] URL Inspection `/playlist/` → **Status**: _____________________________
- [ ] URL Inspection `/playlist/` → **Discovery · Sitemaps**: _______________
- [ ] URL Inspection `/playlist/` → **Discovery · Referring page**: _________
- [ ] URL Inspection `/playlist/` → **Last crawl**: _________________________
- [ ] Performance → clicks + impressions de la última semana para `/playlist/`
- [ ] Coverage → sigue en "Crawled - not indexed"? [Sí / No]
- [ ] Si sigue igual → segundo intento de Request Indexing
- [ ] Total indexed pages del site (Pages report): _________

**Notas**:
```

```

### 📅 Día +14 (2026-07-15)

- [ ] URL Inspection `/playlist/` → **Status**: _____________________________
- [ ] `/playlist/` finalmente indexada? [Sí / No]
- [ ] Site-wide impressions de la última semana vs. baseline pre-drop: ______
- [ ] Coverage → alguna URL más salió de "Crawled - not indexed"? [# antes / # después]

**Notas**:
```

```

### 📅 Día +30 (2026-08-01)

- [ ] Recovery general del tráfico site-wide en Performance (7d vs baseline pre-drop):
      _______% recuperado
- [ ] Rankings de las 5 queries seed en Ahrefs / SEMrush (si tenés acceso):
      - twerk choreography: pos _____ (baseline pre-drop: _____)
      - korean cheerleader fancam: pos _____ (baseline: _____)
      - cosplay fancam: pos _____ (baseline: _____)
      - twerk tutorial: pos _____ (baseline: _____)
      - kpop dance: pos _____ (baseline: _____)

---

## Escalación · si al día 14 seguimos "Crawled - currently not indexed"

Descartada la hipótesis técnica (sitemap OK, referring pages OK, canonical OK, contenido
enriquecido). Siguientes vectores a auditar en orden:

1. **Backlink profile** — Ahrefs/SEMrush del dominio. Si hay flags de spam / low-quality
   inbound links post-junio, hay que hacer disavow.
2. **Internal PageRank flow** — verificar que las top pages (home, /playlist/,
   creators-*) reciben suficiente link equity vs. las páginas thin
   `models-cheerleaders/*-mc-*.html` que puede estar diluyendo el flujo.
3. **Core Web Vitals reales** — PageSpeed Insights sobre `/playlist/`
   con datos CrUX de campo. Si LCP > 2.5s o INP > 200ms, hay que optimizar.
4. **HelpfulContent signal** — auditar las 855 nuevas SEO pages de `/models-cheerleaders/`
   por similitud entre sí. Si son thin/dupe, Google puede estar aplicando penalty
   site-wide.

---

## Top-20 URLs por link-in interno (de análisis previo)

Referenciar acá cuando revisemos coverage — son las que MÁS impact tienen si suben o bajan:

| URL | Link-in count |
|---|---:|
| /hottest-cosplay-fancam/ | 4971 |
| /account | 3878 |
| /alexia-video-packs | 3876 |
| /playlist/ | 3729 |
| /recent.html | 3608 |
| /korean-girls-kpop-twerk/ | 3501 |
| /glossary.html | 2688 |
| /contact.html | 2669 |
| /search.html | 2667 |
| /creators | 2641 |
| /ttl-latin-models/ | 2582 |
| /profile | 2543 |
| /community.html | 2407 |
| /blog/ | 2392 |
| /try-on-hot-leaks/ | 2206 |
| /twerk-hub-leaks/ | 1933 |
| /pt/ | 1688 |
| /creators-russia.html | 1518 |
| /paid-content.html | 1495 |
| /creators-moscow.html | 1398 |
