# 🤝 COWORK HANDOFF — audit/rebuild remaining playlists to sagrada canon

**Session:** `claude/gallant-brattain-2ccd05` · branch `main`
**Last commit:** `6df0937` (CSS tokens merge · `?v=20260420-p22`)
**Canon source of truth:** [`SAGRADAS_PLAYLIST.md`](SAGRADAS_PLAYLIST.md) at repo root

---

## 1. Qué está arreglado (lo que NO tocar)

| Playlist | URL | Estado |
|---|---|---|
| TTL 4K Leaks | `/playlist-ttl-4k-leaks.html` | ✅ rebuilt from scratch · sagrada p22 |
| Twerk Hub Leaks | `/playlist-twerk-hub-leaks.html` | ✅ sagrada · already the gold-standard template · bumped to p22 |

Ambas verificadas en prod: 20/20 y 60/60 thumbs loaded, nav 6 exactos, body `twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater`, 0 Anti fuera del footer, 0 "Del Otro Lado", 0 español, JSON-LD válido, topbar 1220px centrada, fondo dark radial-gradient.

---

## 2. Qué sigue roto / pendiente (lo que hay que arreglar)

| Playlist | URL | Problemas conocidos | Prioridad |
|---|---|---|---|
| Korean (legacy) | `/playlist-corean` | Español (H1 "lo mejor"), nav 7 con Twerk Hub + Del Otro Lado, body-class sin `twerkhub-pl-clean`, 0 cards, es un HTML antiquísimo | 🔴 **REBUILD desde cero** |
| Cosplay Fancam Leaks | `/playlist-cosplay-fancam-leaks.html` | Necesita auditoría sagrada completa | 🟡 audit + fix |
| Latina Model Leaks | `/playlist-latina-model-leaks.html` | Necesita auditoría sagrada completa | 🟡 audit + fix |
| Try-On Haul Leaks | `/playlist-try-on-haul-leaks.html` | Necesita auditoría sagrada completa | 🟡 audit + fix |
| Twerk Hub (sin -leaks) | `/playlist-twerk-hub.html` | Posiblemente legacy / placeholder | 🟡 audit + fix o deprecar |

---

## 3. Bugs encontrados en esta sesión + root causes (para no repetirlos)

### Bug A · óvalo verde gigante cubriendo cada thumb
**Síntoma:** pill `#NNN` verde se renderizaba a 206×126 px en vez de 30×11 px, cubriendo todo el card.
**Root cause:** `assets/twerkhub-auth-patch.js` inyecta un stylesheet con `.twk-gated::before { inset: 0; ... }`. Como todo `.vcard` tiene un solo `::before` pseudo-element, esa regla se mergea con la sagrada `body.twerkhub-pl-clean .vcard::before` (el pill `#NNN`). La sagrada ganaba por specificity en conflicts, PERO no declaraba `right`/`bottom` → el `inset: 0` leakeaba como `right: 0; bottom: 0` → pill estirado.
**Fix (p20):** en `twerkhub-page.css` agregué al pill sagrada:
```css
body.twerkhub-pl-clean .vcard::before {
  right:auto !important; bottom:auto !important;
  width:max-content !important; height:max-content !important;
  inset:auto !important;
  /* + redeclarar top/left/padding/bg/border-radius con !important */
}
body.twerkhub-pl-clean .twk-gated .vthumb img,
body.twerkhub-pl-clean .twk-gated .vthumb video{ filter:none !important }
```

### Bug B · thumbnails quedan en blanco (`loading="lazy"` roto)
**Síntoma:** 20/20 y 60/60 `.vcard .vthumb img` con `complete: false, naturalWidth: 0, currentSrc: ""` — el browser NUNCA dispara el load event.
**Root cause:** bug de Chrome lazy-loading en containers con `aspect-ratio: 16/10` + `object-fit: cover` + `isolation: isolate` sobre `.vcard`. Un `new Image()` fresh con misma URL carga bien.
**Fix (p21):** remover `loading="lazy"` de los `<img>` en el grid (conservar `decoding="async"`). El iframe del player puede quedar con `loading="lazy"` — ese funciona OK.
```bash
# Patrón exacto a reemplazar en el HTML de cada playlist:
loading="lazy" decoding="async"  →  decoding="async"
```

### Bug C · fondo blanco + botonera estirada + H1 gradient invisible
**Síntoma:** body bg transparent, `.twerkhub-pl-topbar-inner` width = 2825px (viewport completo), H1 `em` con `color:transparent` sin gradient visible → gap.
**Root cause:** el 2do bloque `:root { --tw-bg; --tw-max; --tw-pink; ... }` en `twerkhub-page.css` línea 482 se dropeaba silenciosamente del CSSOM de Chrome. Solo quedaba el primer `:root` con `--twerkhub-*`. Todas las reglas sagrada usan `var(--tw-*)` que fallaban → valores iniciales (transparent, none).
**Verificación:**
```js
getComputedStyle(documentElement).getPropertyValue('--tw-max')      // "" (antes) / "1220px" (después)
getComputedStyle(documentElement).getPropertyValue('--tw-bg')       // "" (antes) / "#05050a" (después)
```
**Fix (p22):** mergear los 22 tokens `--tw-*` dentro del PRIMER `:root` en `twerkhub-page.css` (que sí parsea). Dejé el 2do `:root` abajo por si algo else lo referencia. No hace falta tocarlo.
**Impacto:** este fix es **CSS-global** — se aplica a toda playlist sagrada automáticamente, no hay que editar las HTML individuales.

### Bug D · Home bio section colisionaba con playlists section
**Síntoma:** `Pick your playlist.` header rendeaba encima de los timeline cards (2013/2015/2018/2026).
**Root cause:** `assets/global-brand.js` inyectaba `section[class*="bio" i] { max-height: 520px !important }` que matcheaba `<section class="twerkhub-bio-home">` y clippeaba su altura.
**Fix (p19):** removí el selector `section[class*="bio" i]` del stylesheet inyectado en `global-brand.js`. Legacy pages con `.bio-section` / `.founder-*` siguen funcionando.

---

## 4. Plan de trabajo para cada playlist pendiente

Para **Cosplay Fancam / Latina Model / Try-On Haul** (que probablemente usan renderer dinámico con `data-playlist` en vez de cards pre-renderizadas):

### Paso 1 — Auditar contra el pre-commit checklist sagrada

```js
// En Chrome MCP, navegar a la playlist y ejecutar:
(() => {
  const checks = {
    title: document.title,
    h1: document.querySelector('h1')?.textContent.trim(),
    h1_count: document.querySelectorAll('h1').length,
    body_class: document.body.className,
    nav: Array.from(document.querySelectorAll('.twerkhub-pl-tb-nav a, nav a')).map(a=>a.textContent.trim()),
    hot_ranking_header: document.querySelector('.twerkhub-pl-hotrank-h2, .hotrank h2')?.textContent.trim(),
    intro: document.querySelector('.twerkhub-pl-intro')?.textContent.trim(),
    kicker: document.querySelector('.twerkhub-pl-hero .twerkhub-pl-kicker')?.textContent.trim(),
    vcard_count: document.querySelectorAll('.vcard').length,
    rk_item_count: document.querySelectorAll('.rk-item').length,
    thumbs_loaded: Array.from(document.querySelectorAll('.vcard .vthumb img')).filter(i=>i.complete&&i.naturalWidth>0).length,
    thumbs_broken: Array.from(document.querySelectorAll('.vcard .vthumb img')).filter(i=>!i.complete||i.naturalWidth===0).length,
    anti_count_outside_footer: document.body.innerHTML.replace((document.querySelector('.twerkhub-pl-footer')||{outerHTML:''}).outerHTML,'').match(/Anti/gi)?.length||0,
    del_otro_lado: document.body.innerHTML.match(/Del Otro Lado/gi)?.length||0,
    not_on_youtube: document.body.innerHTML.match(/not on YouTube/gi)?.length||0,
    exclusive_total: document.body.innerHTML.match(/exclusive/gi)?.length||0,
    jsonld_blocks: document.querySelectorAll('script[type="application/ld+json"]').length,
    css_href: document.querySelector('link[rel="stylesheet"][href*="twerkhub-page.css"]')?.getAttribute('href')
  };
  return checks;
})();
```

Resultado esperado (sagrada compliant):
- `title`: `Hottest [theme] videos on YouTube · many +18 only · Twerkhub`
- `h1_count`: 1
- `body_class`: contiene `twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater`
- `nav`: `[Home, Exclusive, Playlists, Tokens, VR, Profile]` (6 exactos)
- `hot_ranking_header`: `"Hot ranking this week"` (literal)
- `intro`: `Curated [theme] cuts · updated every week · handpicked by the hub.`
- `thumbs_broken`: 0
- `anti_count_outside_footer`: 0
- `del_otro_lado`: 0
- `not_on_youtube`: 0
- `exclusive_total`: 1
- `jsonld_blocks`: 2 (CollectionPage + ItemList)
- `css_href`: `/assets/twerkhub-page.css?v=20260420-p22` o superior

### Paso 2 — Si no es compliant → rebuild from scratch

**Template a clonar:** `playlist-twerk-hub-leaks.html` (el gold standard auditado).
**Datos:** usar el `.json` correspondiente en `/assets/` (ej: `assets/cosplay-fancam-leaks-videos.json`). Si no existe, pedirle a Anti los IDs de YouTube.

Estructura sagrada mínima:
1. CSP + referrer meta
2. `<title>` + H1 con patrón `Hottest [theme] videos on YouTube`
3. JSON-LD `CollectionPage` + `ItemList` (solo en JSON-LD van los nombres de modelos — sagrada 18)
4. `<body class="twerkhub-pl-page twerkhub-pl-clean twerkhub-pl-theater" data-page="playlist-[name]">`
5. Skip link + topbar con 6 links exactos
6. Hero: kicker `/ [Theme] · pick of the week` + H1 + intro ≤80 chars
7. Main theater: player iframe + aside hotrank con 5 rk-items
8. Section grid con 20-60 vcards pre-rendered (sin `loading="lazy"` en los imgs)
9. Section CTA final: `Talk to Alexia →` → Discord + `Browse playlists`
10. Footer: `If you know, you know.` + `© 2026 Twerkhub · founded by Anti (firestarter)` (único lugar donde se nombra Anti)
11. Inline `<script>` con guard `__twerkhub[Name]TheaterInit`, TOP5 + GRID arrays, swap() handler
12. Defer scripts: `global-brand.js` + `twerkhub-auth-patch.js` con cache-bust

**Cache-bust actual:** `?v=20260420-p22`. Bumpear a `p23+` si hacés más cambios.

### Paso 3 — Correr el checklist + verificar en prod con cache-bust

```
https://alexiatwerkgroup.com/playlist-[name].html?nc=verify
```

Confirmar: thumbs 100% loaded, nav centrada, fondo dark, H1 gradient visible.

---

## 5. Para la playlist Korean (`/playlist-corean`)

**Estado actual:** página legacy totalmente non-compliant. No es `.html` sino probablemente un ruteo Cloudflare. Tiene español, nav 7 con Twerk Hub/Del Otro Lado, 0 cards, body sin `twerkhub-pl-clean`.

**Acción recomendada:**
1. Crear `playlist-corean.html` (o `playlist-korean.html`) nuevo desde cero usando template de twerk-hub-leaks
2. Usar datos de `assets/corean-videos.json`
3. Tema: "K-dance" o "Korean"
4. Title: `Hottest Korean videos on YouTube · many +18 only · Twerkhub`
5. Intro: `Curated Korean cuts · updated every week · handpicked by the hub.`
6. Confirmar que home `/` card `Korean` linkee al nuevo URL (`/playlist-corean.html` o `/playlist-korean.html`)
7. Agregar 410 Gone en `_redirects` para la ruta legacy si queda algo viejo

---

## 6. Reglas estrictas mientras arreglás

1. **NO tocar** `playlist-ttl-4k-leaks.html` ni `playlist-twerk-hub-leaks.html` — ya están perfectas.
2. **NO tocar** `assets/twerkhub-media.js`, `twerkhub-paywall.js`, `twerkhub-playlist-renderer.js`, `twerkhub-titles.js` — son legacy. Si hay bug, crear módulo paralelo `twerkhub-*` nuevo (sagrada rule módulos).
3. **NO agregar** `loading="lazy"` a los `<img>` del grid — Chrome lo rompe en aspect-ratio containers.
4. **NO nombrar** modelos en DOM visible — solo en JSON-LD.
5. **Antes de cada commit**, correr el checklist JS del paso 1 y validar los 15+ puntos.
6. **Cache-bust incremental**: cada commit → bump `?v=20260420-pNN` en TODOS los assets de la página editada.
7. **Commit format:** `rebuild(playlist-X): ...` o `fix(playlist-X): ...` con explicación del bug + cómo se verificó.

---

## 7. Recursos

- Canon: [`SAGRADAS_PLAYLIST.md`](SAGRADAS_PLAYLIST.md)
- Template oro: [`playlist-twerk-hub-leaks.html`](playlist-twerk-hub-leaks.html)
- Template reciente (con lecciones aprendidas): [`playlist-ttl-4k-leaks.html`](playlist-ttl-4k-leaks.html)
- CSS tokens: [`assets/twerkhub-page.css`](assets/twerkhub-page.css) línea 17-62 (primer `:root` con vars `--twerkhub-*` + `--tw-*`)
- Links oficiales Discord/Telegram/OF/Patreon/X están en `SAGRADAS_PLAYLIST.md` sección 🔗

**Commits relevantes de esta sesión** (para context):
- `32ec62b` — refactor playlists apply 20 sagradas audit to twerk-hub-leaks
- `607fa71` — fix home bio grid isolation
- `e828f6b` — fix global-brand legacy bio section max-height
- `62526c2` — rebuild ttl-4k-leaks sagrada
- `957d785` — fix giant green oval (::before + twk-gated)
- `2de41c5` — fix ttl-4k lazy-load thumbs
- `1a7e5f5` — fix twerk-hub-leaks lazy-load thumbs
- `6df0937` — fix CSS tokens `--tw-*` merge into first :root

Buena suerte 🔥
