# Diagnóstico de tracking · 2026-05-11

Fuente: `tracking_alexiatwerkgroupcom.csv` (200 keywords, delta 11/04 → 11/05).

## TL;DR

- **54 mejoraron · 99 iguales · 46 empeoraron · 46 canibalizadas (23%).**
- **HALLAZGO CRÍTICO:** la carpeta `/twerk-hub-leaks/` está **VACÍA en el sitio actual** (sin `index.html` ni playlists). Todo el contenido vive en `_deleted/twerk-hub-leaks/`. Esto explica varios de los desplomes.
- **12 keywords cayeron a posición 100 (fuera del top 100, deindexadas).** Las páginas existen en el repo y NO tienen `noindex`. El problema es ranking/canonical, no archivo.
- La canibalización está concentrada en blogs nuevos compitiendo entre sí y la home compitiendo con `/about.html` y `/membership.html`.

---

## 1. Las 12 caídas a posición 100 (deindexadas)

Todas las páginas existen en el repo y están en sitemap. **NO tienen `noindex`**. Probable causa: cambios recientes de canonical / SW caching de 404 / hreflang roto, o sección entera deletada (caso `twerk-hub-leaks`).

| # | Keyword | Src | Antes | Ahora | URL archivo | En sitemap | Notas |
|---|---|---|---|---|---|---|---|
| 1 | `lada gozzi high heels pharaoh plombir mdc nrg` | pc | 1 | 100 | `creator/lada-gozzi.html` | ✅ | Existe + canonical OK |
| 2 | `juicy realmoneyken instasamka indica twerk` | pc | 4 | 100 | `playlist/juicy-prod-realmoneyken-instasamka-indica-twerk-choreo.html` | ✅ | Existe + canonical OK |
| 3 | `hottest cosplay fancam 4k anime archive` | pc | 4 | 100 | `hottest-cosplay-fancam/index.html` | ✅ | Existe, canonical apunta a `/hottest-cosplay-fancam/` |
| 4 | `bow bow bow sexyy red maine twerk class` | pc | 15 | 100 | `playlist/bow-bow-bow-sexyy-red-f-my-baby-dad-maine-twerk-class.html` | ✅ | Existe + canonical OK |
| 5 | `big boss vette pretty girls walk angela idance` | pc | 15 | 100 | `playlist/big-boss-vette-pretty-girls-walk-angela-choreographyidance.html` | ✅ | Existe + canonical OK |
| 6 | `alexia twerk leaks` | movil | 15 | 100 | `/twerk-hub-leaks/` | ❌ **NO en sitemap** | ⚠️ **CARPETA VACÍA EN PROD** |
| 7 | `choreo shoshina katerina major lazer anitta karol g en la cara` | movil | 22 | 100 | `playlist/choreo-by-shoshina-katerina-major-lazer-feat-anitta-karol-g-en-la-cara.html` | ✅ | Existe + canonical OK |
| 8 | `barbie world nicki minaj ice spice claudia` | movil | 28 | 100 | `playlist/barbie-world-nicki-minaj-ice-spice-l-claudia-redheaded.html` | ✅ | Existe + canonical OK |
| 9 | `twerkhub vs onlyfans vs fanvue comparison` | pc | 29 | 100 | `blog/twerkhub-vs-onlyfans-fanvue-comparison.html` | ✅ | Existe + canonical OK |
| 10 | `bodak yellow cardi b alina pavliuchenko twerk` | pc | 30 | 100 | `playlist/bodak-yellow-cardi-b-twerk.html` | ✅ | Existe + canonical OK |
| 11 | `pop smoke dior indica team lena indica` | pc | 51 | 100 | `playlist/pop-smoke-dior-twerk-choreo-by-indica-team.html` | ✅ | Existe + canonical OK |
| 12 | `beyonce yonce twerk heels choreo` | pc | 80 | 100 | `playlist/beyonce-yonce-twerk-heels-choreo.html` | ✅ | Existe + canonical OK |

### Issue #1 — `/twerk-hub-leaks/` carpeta vacía (CRÍTICO)

```
twerk-hub-leaks/          ← VACÍO en producción
_deleted/twerk-hub-leaks/ ← todo el contenido movido acá (31 playlists + index.html)
```

Por algo en una sesión pasada movimos todo el folder a `_deleted/`. Resultado:
- Mobile dejó de rankear "alexia twerk leaks" (15 → 100).
- En desktop el URL sigue rankeando residualmente (Google demora en purgar) pero va a caer también.
- "twerk hub leaks 4k curated archive" canibalizado contra `/cosplay-fancam-leaks/` porque la primaria está rota.

**Acción urgente — restaurar `index.html` mínimo o redirigir:**

```powershell
# Opción A: restaurar index.html del backup
cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
Copy-Item "_deleted\twerk-hub-leaks\index.html" "twerk-hub-leaks\index.html" -Force
git add twerk-hub-leaks/index.html
git commit -m "fix: restore /twerk-hub-leaks/ index page (was missing, killed rankings)"
git push
```

```powershell
# Opción B: si NO querés el contenido leaks live, redirige 301 a algo vivo
# Editar _redirects y agregar al inicio:
# /twerk-hub-leaks/  /twerk-dance-video.html  301
# /twerk-hub-leaks/*  /twerk-dance-video.html  301
```

Recomendado: **Opción A** (restaurar), porque `/twerk-hub-leaks/` rankea para "twerk hub leaks 4k curated archive" en pos 1 actualmente. Si lo redirigís perdés ese ranking.

### Issue #2 — Las otras 11: validar canonical + indexabilidad live

Las páginas existen y se ven correctas en el repo. La caída a 100 puede ser un blip de Google o un canonical mal apuntado en producción (no en el repo). **Acción:**

1. Para cada una, abrir `view-source:URL` y verificar:
   - `<link rel="canonical">` apunta a la misma URL (no a otra).
   - No hay `<meta name="robots" content="noindex">` inyectado dinámicamente por JS.
   - El HTML responde 200, no 404 ni redirect.
2. Pedir reindexación manual en Google Search Console (`URL Inspection` → `Request Indexing`).
3. Bumpear cache buster del `service-worker.js` y forzar deploy.

PowerShell para hard-bust de SW y forzar fresh fetch de Google:

```powershell
cd "C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean"
$NoBom = New-Object System.Text.UTF8Encoding($false)
$sw = "service-worker.js"
$orig = [IO.File]::ReadAllText($sw, [Text.Encoding]::UTF8)
$new = [regex]::Replace($orig, "const CACHE_NAME = 'alexia-pwa-v\d+\.\d+\.\d+';", "const CACHE_NAME = 'alexia-pwa-v2.2.0';")
[IO.File]::WriteAllText($sw, $new, $NoBom)
git add service-worker.js
git commit -m "sw: bump cache name to v2.2.0 (force fresh fetch on dropped pages)"
git push
```

---

## 2. Las 46 keywords canibalizadas (23% del total)

Agrupadas por URL primaria. Para cada grupo, la **decisión** es:
- **Mantener primaria + agregar `<link rel=canonical>` desde el competidor** apuntando a la primaria, **O**
- **Diferenciar contenido** (cada página debe atacar un intent distinto: blog explicativo vs landing comercial vs playlist).

### 🔴 Blog interno se canibaliza a sí mismo (las 8 más críticas)

Todas estas son pos 1 (perfecto) pero compiten contra otros blogs. El riesgo es perder pos 1 si Google "cambia de opinión".

| Keyword | Primaria (pos 1) | Compite con | Acción sugerida |
|---|---|---|---|
| `why twerkhub has no algorithm feed` | `/blog/why-twerkhub-has-no-algorithm-feed.html` | pos9 `/blog/why-i-built-twerkhub.html` | Agregar link interno explícito desde "why-i-built" a "why-no-algorithm" con anchor "no algorithm feed" |
| `how to earn 10000 tokens twerkhub` | `/blog/how-to-earn-tokens-twerkhub.html` | pos2 `/blog/the-4-tiers-explained.html` | Diferenciar título de tiers ("4 niveles de membresía" en lugar de "earn tokens") |
| `token economy playbook twerkhub` | `/blog/token-economy-playbook.html` | pos2 `/blog/why-i-built-twerkhub.html` | Reducir menciones de "token economy" en "why-i-built" |
| `discord community playbook twerkhub` | `/blog/discord-community-playbook.html` | pos2 `/blog/why-i-built-twerkhub.html` | Reducir menciones de "discord community" en "why-i-built" |
| `4 tiers twerkhub explained` | `/blog/the-4-tiers-explained.html` | pos2 `/membership.html` | Hacer membership.html más comercial (precios), the-4-tiers más educativo |
| `twerkhub creator dashboard` (pc) | `/blog/how-to-pitch-twerkhub-creator.html` | pos2 `/blog/` | Mejor anchor de homepage hacia "how-to-pitch" |
| `weekly drop calendar 2026 twerkhub` | `/community.html` | pos2 `/blog/` | Mover el calendario fuera del index de blog, dejar solo en community.html |
| `twerkhub vs fanvue` | `/blog/why-twerkhub-has-no-algorithm-feed.html` | pos5 `/blog/` | Mover el contenido "vs fanvue" a un blog dedicado (también vendría bien para "twerkhub vs onlyfans vs fanvue comparison" que cayó a 100) |

### 🟡 Home vs about/playlist

| Keyword | Primaria | Compite con | Acción |
|---|---|---|---|
| `alexia twerk oficial` (pc) | `/` pos2 | pos7 `/twerk-dance-video.html` | OK como está, primaria gana |
| `alexia twerk group` | `/about.html` pos5-6 | pos10 `/playlist/` | Reforzar internal links a about con anchor "alexia twerk group" |
| `twerk hub` (pc) | `/playlist/` pos50 | pos51 `/playlist/twerking-course-beginner-preview.html` | Subir contenido en playlist/index para que `twerk hub` rankee mejor |

### 🟢 Playlist vs creator page (decisión: mantener playlist como primaria)

| Keyword | Primaria | Compite con | Acción |
|---|---|---|---|
| `nicki minaj barbie world ciri kato dance studio` (pc) | `/playlist/nicki-minaj-barbie-world-twerk-dance-ciri.html` pos1 | pos4 `/creator/kato-dance-studio.html` | OK, primaria gana |
| `nicki minaj barbie world ciri kato dance studio` (movil) | `/twerk-hub-leaks/nicki-minaj-barbie-world-twerk-dance-ciri-kato-dance-st` (broken, en `_deleted/`) | pos4 `/playlist/...` | ⚠️ Cambiar la URL primaria al playlist (la actual está deletada) |
| `cardi b up melinda efteni velvet young` | `/playlist/cardi-b-up-melinda-efteni-twerk-velvet-young.html` pos5 | pos9 `/twerk-dancer/melinda-efteni.html` | OK |
| `britney spears toxic nika chill twerk class los angeles` (movil) | `/playlist/britney-spears-toxic-nika-chill-twerk-class-los-angeles.html` | pos8 `/creator/nika-chill.html` | OK |
| `anitta tocame arcangel de la ghetto viktoria boage` | `/playlist/anitta-tocame-feat-arcangel-de-la-ghetto-viktoria-boage-...` pos7 | pos10 `/playlist/oksi-twerk-twerk-choreography-btqqt1a.html` | OK, pero quitar el video del index `twerk-11` |
| `boa megan thee stallion choreo jutty` (movil) | `/playlist/boa-juttys-twerk-team.html` | pos55 `/playlist/jutty-twerk-choreo-by-anaconda-slay-...` | OK |

### 🟡 Creator hub vs playlist (mantener creator hub si tier ≥ 9k)

| Keyword | Primaria | Compite con | Acción |
|---|---|---|---|
| `abasheva yana twerkit studio moscow` | `/creator/abasheva-yana.html` pos1 | pos4 `/creators-moscow.html` | OK |
| `nicki minaj yikes twerk dasha kolesnikova` (pc) | `/creator/dasha-kolesnikova.html` | pos6 `/creators-russia.html` | OK, mantener creator |
| `choreo shoshina katerina fetty wap trap queen` | `/shoshina-katherina.html` pos35-36 | pos36-38 `/korean-girls-kpop-twerk/...` (URL coreana) | Mover la mención del kw a shoshina y quitarla de la página coreana |
| `twerk choreo abasheva yana twerkit studio` (pc) | `/playlist/` pos11 | pos15 `/blog/best-twerk-creators-2026.html` | Cambiar primaria al creator page `/creator/abasheva-yana.html` |

### 🔵 Casos donde la primaria está mal apuntada

| Keyword | Primaria | Problema | Acción |
|---|---|---|---|
| `alexia twerk leaks` (pc) | `/twerk-hub-leaks/` | Carpeta vacía | Restaurar `index.html` (ver Issue #1) |
| `twerk hub leaks 4k curated archive` (pc) | `/twerk-hub-leaks/` | Idem | Idem |
| `twerk dance 4k videos twerkhub` (pc) | `/twerk-dance-4k` (sin .html) | Verificar que sirve | Confirmar que existe `twerk-dance-4k.html` o `/twerk-dance-4k/index.html` |
| `bad bunny titi me pregunto twerk choreo anel li` | `/playlist/twerk-freestyle-stormzy-vossi-bop-thequeenbsav.html` | URL primaria NO matchea el kw | Crear playlist específica para "bad bunny titi me pregunto" o reasignar |
| `baja ghetto kids ft malo darell yur aular choreography` | `/style-reggaeton-floor.html` | URL primaria genérica | Crear playlist específica con ese título |
| `danileigh tasty wangong lin kerry chiu choreography` (movil) | `/playlist/silento-watch-me-whip-nae-nae-watchmedanceon.html` | URL primaria NO matchea | Crear playlist específica |
| `choreo shoshina katerina diplo doctor pepper` (movil) | `/playlist/twerk-t-fest-skryptonite.html` | URL primaria NO matchea | Crear playlist específica |

---

## 3. Plan de acción priorizado

### P0 — Esta noche (15 min de trabajo)

1. **Restaurar `/twerk-hub-leaks/index.html`** — comando arriba.
2. **Bumpear SW a v2.2.0** para forzar fresh fetch en las 11 deindexadas.

### P1 — Mañana (1-2h)

3. **Verificar las 11 URLs en producción** con `curl -I` o GSC URL Inspector. Si alguna devuelve 404/redirect/noindex, fixearla.
4. **Pedir reindexación** en Search Console de las 11.
5. **Sitemap audit:** confirmar que `/twerk-hub-leaks/` (cuando se restaure) esté en sitemap.xml.

### P2 — Esta semana (2-4h)

6. **Resolver 7 canibalizaciones críticas de blog** (sección 🔴 arriba). Cada una: ajustar internal links + ajustar densidad de keywords en la página competidora.
7. **Crear 4 playlists faltantes** (sección 🔵): bad bunny titi me pregunto, baja ghetto kids, danileigh tasty wangong, shoshina diplo doctor pepper.
8. **Reapuntar URL primaria** de `twerk choreo abasheva yana twerkit studio` al creator page.

### P3 — Próxima semana

9. **Crear blog post `/blog/twerkhub-vs-fanvue.html` dedicado** (hoy compite contra el `no-algorithm-feed` blog y contra el index del blog).

---

## 4. Métricas para chequear post-fix (en 7 días)

| Métrica | Hoy | Target +7d |
|---|---|---|
| Keywords en top 10 | (calcular del CSV) | +5 |
| Keywords en pos 100 | 12 | ≤ 4 |
| % canibalización | 23% | ≤ 15% |
| `/twerk-hub-leaks/` indexada | ❌ | ✅ |

---

## 5. Anexo: tracking export

CSV original: `tracking_alexiatwerkgroupcom.csv` (200 rows).
Reporte tabular: `TRACKING_DIAGNOSTICO_2026-05-11.xlsx` (con 3 sheets: Dropped, Canib, AllRows).
