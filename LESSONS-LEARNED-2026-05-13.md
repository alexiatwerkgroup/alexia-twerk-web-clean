# LESSONS LEARNED — Twerkhub / alexiatwerkgroup.com

**Período cubierto:** ~2 sesiones de debug intensivo (mayo 2026)
**Mantenedor:** Anti (alexiatwerkoficial@gmail.com)
**Foco:** Paywall race conditions, syntax errors silenciosos, cache busting, blindaje defensivo

---

## 1. Root causes que más daño hicieron

### 1.1 Archivos JS truncados → cascada de `undefined` globals

Patrón repetido: un archivo en `/assets/` queda CORTADO a mitad de línea (`lock.className =` sin terminar, `var s = '...' +` sin cerrar). Esto produce:

1. `SyntaxError: Unexpected end of input` en el archivo
2. El IIFE entero NO se ejecuta
3. `window.TwkAgeGate` (o el global que defina) queda `undefined`
4. Otros módulos (theater-v2, paywall-guard) llaman `TwkAgeGate.showOverlay()` → `TypeError: Cannot read properties of undefined`
5. Visualmente: 1 segundo de mensaje "Video unavailable" de YouTube + pantalla negra eterna
6. El usuario reporta "no funciona" pero los logs solo muestran el syntax error escondido en consola

**Archivos que se truncaron al menos una vez:**
- `assets/twk-paywall-guard.js` (línea ~190)
- `assets/twerkhub-age-gate.js` (línea 282)
- `assets/twk-tokens-v3.js` (línea 480, orphan string)

**Diagnóstico:** `node --check assets/<file>.js` desde PowerShell. Si falla, está truncado.

### 1.2 Cache busters externos olvidados

Tenía un find-replace de `v=20260512-pr-leaks → v=20260513-blindaje-v68` pero el script de deploy no incluía TODOS los cache busters legacy. Resultado: usuario veía HTML con scripts viejos referenciados (`?v=20260512-pr-leaks`) que Cloudflare seguía sirviendo desde edge cache.

**Solución:** mantener `$oldCacheBusters` como array exhaustivo en `DEPLOY-BLINDAJE-V5.ps1`:
```powershell
$oldCacheBusters = @(
  "v=20260426-p8",
  "v=20260512-pr-leaks",
  "v=20260513-blindaje-v67",
  # ...todas las versiones previas
)
```

### 1.3 Race conditions entre sistemas de paywall

Tres sistemas tocaban el mismo iframe:
- `twk-paywall-guard.js` (path-based, classification.json)
- `twerkhub-pl-theater-v2.js` (heartbeat + onError YT)
- `twerkhub-age-gate.js` (TwkAgeGate API)

Cuando los tres corrían sobre el mismo `#twerkhub-pl-player`, se pisaban: uno hacía `src='about:blank'`, otro intentaba leer el vid del src vacío, otro removía el overlay recién puesto.

**Fix:** `hasInlinePlayerInfra()` en `twk-paywall-guard.js` — detecta presencia de `twerkhub-pl-theater-v2.js` o `twk-yt-gate.js` y hace early return, cediendo control. Log: `[twk-paywall-guard] yielding to TwkAgeGate/pl-theater-v2 (inline player detected)`.

---

## 2. Defensive infrastructure construida

### 2.1 `PRE-DEPLOY-VALIDATE.ps1`

Corre ANTES de cada `git commit`. Si algo falla, aborta el deploy:

```
[1/5] JS syntax check (node --check) sobre $criticalJS:
   - twk-tokens-v3.js
   - twk-thumb-to-video.js
   - twk-self-heal.js
   - twk-paywall-guard.js
   - twerkhub-auth.js
   - twk-bot-detect.js
   - twk-guardian.js
   - twk-kill-pink-pills.js
   - twerkhub-age-gate.js          ← agregado 2026-05-13
   - twerkhub-pl-theater-v2.js     ← agregado 2026-05-13
   - twk-yt-gate.js                ← agregado 2026-05-13
[2/5] HTML pattern checks (no `;'>`, twk-related-css OK)
[3/5] account.html founder override (FOUNDER_EMAILS + streak recovery)
[4/5] Cache buster consistency (todos los HTML usan la versión actual)
[5/5] Self-heal script check
```

**Pitfalls con PowerShell que aprendí (a la mala):**
- Em-dashes (`—`) rompen el parser → reemplazar por `-` normal
- Regex con escaped quotes falla → usar single-quoted string pattern
- `Write-Output` y `Tee-Object` cambian el comportamiento de pipeline → preferir `Write-Host` + `Add-Content` explícito

### 2.2 `twk-self-heal.js` — runtime recovery

Auto-corrige estado roto:
- Streak resetea de 3→1 sin razón? `Math.max(localStorage, d1, localState)` recupera el mayor
- Founder email pero tokens=0? Re-aplica founder override
- Cada 2-3s loguea `[SELF-HEAL] Streak recovered to Xd`

### 2.3 IIFE guard pattern

Cada módulo arranca con:
```js
(function(){
  'use strict';
  if (window.__twkMyModuleInit) return;
  window.__twkMyModuleInit = true;
  // ...
})();
```

Previene doble-inicialización si el script se carga 2x por error.

---

## 3. Arquitectura del paywall (estado final 2026-05-13)

```
USER navigates to /ttl-latin-models/
  ├─ twk-bot-detect.js carga PRIMERO
  │   └─ Si Googlebot/crawler → window.__twkIsBot = true → paywall skipped
  ├─ twk-paywall-guard.js carga
  │   └─ hasInlinePlayerInfra() detecta theater-v2.js → YIELDS
  ├─ twerkhub-age-gate.js carga
  │   └─ AGE_GATE_ENABLED = true → expone window.TwkAgeGate API
  │       (isProtected, isBlocked, markBlocked, show, showOverlay,
  │        hideOverlay, handleYTError, decorateAll)
  └─ twerkhub-pl-theater-v2.js carga
      ├─ injectStyle()
      ├─ installInlineErrorListener()
      │   └─ Escucha postMessage YT onError 101/150 → showInlinePaywall()
      ├─ patchInlinePlayer()
      │   └─ MutationObserver on iframe.src
      │       └─ Si src cambia → armPaywallHeartbeat(vid)
      │           └─ setTimeout 2500ms → si !__twkInlinePlaybackStarted
      │               → TwkAgeGate.showOverlay(wrap, vid)
      │               → Renderea overlay con gradient #1a0a14→#85113f
      │               → CTA "UNLOCK MEMBERSHIP →" → /membership
      └─ subscribeInlineToEvents()
          └─ postMessage staggered 50ms/200ms/400ms (evita bot-detection YT)
              ├─ listening (handshake)
              ├─ addEventListener onError
              └─ addEventListener onStateChange
                  └─ Si state === 1 (PLAYING) → __twkInlinePlaybackStarted = true
                      → heartbeat se cancela → no paywall
```

### Bypass para founder/VIP

`isMember()` en `twk-paywall-guard.js`:
1. `JSON.parse(localStorage['alexia-auth-v3']).user.email === FOUNDER_EMAIL`
2. `localStorage['alexia_tokens_v1.tier']` === `'vip'` o `'premium'`
3. `localStorage['alexia_role']` === `'founder'` (legacy)

Si CUALQUIERA es true → `resolveIframes()` restaura src original sin overlay.

### Paywall paths config

```js
PAYWALL_PATHS = [
  '/twerk-hub-leaks/',
  '/hottest-cosplay-fancam/',
  '/korean-girls-kpop-twerk/',
  '/try-on-hot-leaks/',
  '/sav-twerk-playlist/',
  '/ttl-latin-models/',      // restaurado 2026-05-13
  '/playlist/'
]
PAYWALL_DENY_PREFIXES = ['/sav-twerk-playlist/']  // off durante indexing window
```

---

## 4. Sistema de cache busters

**Patrón:** `?v=YYYYMMDD-blindaje-vNN`

**Update flow en cada deploy:**
1. Bump `$newCacheBuster` en `DEPLOY-BLINDAJE-V5.ps1` (ej. `v68 → v69`)
2. Agregar la versión vieja a `$oldCacheBusters` array
3. Script hace find-replace en TODOS los HTML (`.html`, recursivo)
4. PRE-VALIDATE chequea consistencia (paso 4/5)
5. Commit + push
6. Cloudflare Pages auto-deploy en ~60-90s
7. Verificar `_deploy-log.txt` para `VALIDATION OK` + commit hash

**Cloudflare cache layers (todos hay que invalidar):**
- Edge cache (browser): respeta `?v=` → bump = invalidate
- CF Pages cache: respeta git commit → push = invalidate
- Service worker: si existe, hay que `clients.claim()` + skipWaiting

---

## 5. Patrones de UI que aprendí

### 5.1 YouTube embed blindaje params

Sacralizado en TODOS los iframes:
```
?autoplay=1&controls=0&disablekb=1&enablejsapi=1&fs=0
&iv_load_policy=3&modestbranding=1&mute=1&playsinline=1
&rel=0&origin=https://alexiatwerkgroup.com
&widget_referrer=https://alexiatwerkgroup.com
```

**Host:** SIEMPRE `youtube-nocookie.com/embed/{vid}` (no `youtube.com/embed/`)

**Allow:** `autoplay; encrypted-media; picture-in-picture; fullscreen`

### 5.2 Anti-thumbnail-to-video flicker

Si la página renderea cards con `<img>` thumbnails, NO swappear a iframe al click. En vez:
- `twk-thumb-to-video.js` redirige `<a href="/playlist/[slug]">` con VID→slug map cacheado en `sessionStorage`
- `redirectCreatorCardsToPlaylist()` fetcha `/playlist/` una vez y construye el map
- `dedupeCreatorCards()` esconde duplicados por href/name/VID

### 5.3 Overlay z-index hierarchy

```
.twk-blocked-lock:    z 8     (🔒 grande centrado sobre thumb)
.twk-blocked-badge:   z 9     (badge "🔒 +18" esquina)
.twk-paywall-badge:   z 9     (variante con "$")
.twk-video-shield-cap: z 5    (botón transparente cubre iframe)
.twk-video-shield-ctrls: z 10 (controles custom abajo)
.twk-video-shield-cta: z 12   (CTA visible cuando paywall ON)
.twk-paywall-overlay: z 20    (overlay paywall guard)
.twk-pl-fallback-paywall: z 60 (fallback Discord/Telegram)
.twk-age-overlay:     z 999   (overlay age-gate, MÁXIMO)
```

Regla: el `.twk-age-overlay` siempre gana porque tiene que tapar la UI de YouTube "Video unavailable" que se pinta en z ~100 dentro del iframe.

---

## 6. Verificación post-deploy via Chrome MCP

```js
// Smoke test mínimo
({
  TwkAgeGate: typeof window.TwkAgeGate,           // ← debe ser "object"
  methods: Object.keys(window.TwkAgeGate),         // ← debe tener 8 items
  paywallGuard: !!document.querySelector('script[src*="twk-paywall-guard"]'),
  theaterScript: !!document.querySelector('script[src*="twerkhub-pl-theater-v2"]'),
  iframe: (() => {
    const i = document.querySelector('iframe');
    const m = (i?.getAttribute('src')||'').match(/embed\/([^?]+)/);
    return { vid: m?.[1], visible: i?.offsetParent !== null };
  })()
})
```

**Lo que confirma que está OK:**
- TwkAgeGate object con 8 methods (no undefined)
- Console log: `[twk-paywall-guard] yielding to TwkAgeGate/pl-theater-v2 (inline player detected)`
- Console log: `[twerkhub-playlist] theater boot`
- Title de tab muestra título normal (no `inline_age=undefined err=...`)

**Limitación Chrome MCP:** el iframe de YouTube puede aparecer NEGRO en MCP aunque funcione en browser real. YouTube responde Error 153 ("Video player configuration error") porque MCP no tiene el cookie context completo. NO es bug del sitio.

---

## 7. Bugs específicos y sus fixes

| Bug | Síntoma | Root cause | Fix |
|---|---|---|---|
| Black screen 1s YT + black | Paywall no aparece, solo negro | `TwkAgeGate` undefined por truncamiento línea 282 | Completar `addBlockedDecoration`, `injectStyle`, `showOverlay`, `hideOverlay` y exportar API completa |
| Tokens=0, founder no detectado | Account muestra 0 tokens, sin VIP TOP | localStorage `alexia-auth-v3` sin email o tier no se lee | Founder email match + `Math.max()` entre localStorage/D1/localState |
| Streak resetea 3→1 | Día siguiente arranca en 1 en vez de 4 | Self-heal no se ejecutaba (script roto por syntax error en otro JS) | `twk-self-heal.js` corre cada 2-3s + lee múltiples sources |
| Creators videos minúsculos | Thumbs colapsadas a tamaño chico con autoplay | `attachClickHandler` swappeaba img→iframe inline | Disable swap, redirigir cards a `/playlist/[slug]` |
| Creators duplicados | Mismo video aparece 3-4 veces en grid | Index fuente tenía duplicados por slug/nombre | `dedupeCreatorCards()` filtra por href + VID + nombre normalizado |
| YT toast "tokens pill" rota | Pill no renderea, no toast | Orphan string línea 480 (`'position:fixed;' +`) sin contexto | Envolver en `if (!document.getElementById('twk-toast-host-v3')) { var host = ... }` |

---

## 8. Workflow de deploy óptimo (lección final)

```bash
# 1. Editar archivos en assets/ y/o HTML
# 2. CORRER VALIDACIÓN MANUAL ANTES de deploy
node --check assets/twerkhub-age-gate.js
node --check assets/twerkhub-pl-theater-v2.js
node --check assets/twk-paywall-guard.js
# 3. Bump cache buster en DEPLOY-BLINDAJE-V5.ps1
# 4. Run deploy script
powershell -File DEPLOY-BLINDAJE-V5.ps1
# 5. Esperar 60-90s para Cloudflare Pages
# 6. Smoke test via Chrome MCP en producción:
#    - typeof window.TwkAgeGate === 'object'
#    - paywall renderea en /ttl-latin-models/ para no-miembros
#    - founder bypass funciona (1M+ tokens visible)
# 7. Si algo falla, leer _deploy-log.txt para VALIDATION OK + commit hash
```

---

## 9. Reglas que aprendí y NUNCA quiero olvidar

1. **Si un módulo expone `window.SomeAPI`, SIEMPRE chequear que `typeof window.SomeAPI === 'object'` post-deploy.** Un undefined silencioso rompe TODA la cadena downstream.

2. **`node --check` antes de cada commit.** Es gratis, toma 200ms, y atrapa el 90% de los errores que llegan a producción.

3. **Cache busters EXHAUSTIVOS.** Si una versión vieja queda referenciada en un HTML, Cloudflare la sirve eterna. Mantener `$oldCacheBusters` actualizado.

4. **Race conditions: yield, no compete.** Si dos sistemas hacen lo mismo, uno DEBE ceder al otro explícitamente con un early-return.

5. **Founder bypass en TODOS los gates.** Tier check + email check + role check, en orden, con OR. Founder nunca debe ver paywall.

6. **PowerShell odia em-dashes y smart quotes.** Usar ASCII puro en scripts.

7. **Chrome MCP ≠ browser real.** Si MCP muestra Error 153 de YouTube, probablemente está bien en producción. Verificar logs, no solo screenshots.

8. **`twk-bot-detect.js` carga PRIMERO.** Si no, Googlebot ve la paywall y mata el SEO.

9. **`AGE_GATE_ENABLED` flag respeta indexing windows.** Bot-detection cubre SEO; el flag se usa para apagar TODO temporalmente si hay incidente.

10. **`_deploy-log.txt` es la verdad.** `VALIDATION OK (0 warnings)` + commit hash + `git push` exitoso = deploy real. Sin eso, asumir que no pasó nada.

---

## 10. Archivos críticos del proyecto (referencia rápida)

| Archivo | Rol |
|---|---|
| `assets/twerkhub-age-gate.js` | API `TwkAgeGate` — paywall overlay |
| `assets/twerkhub-pl-theater-v2.js` | Theater inline player + heartbeat |
| `assets/twk-paywall-guard.js` | Path-based paywall con classification.json |
| `assets/twk-bot-detect.js` | Whitelist crawlers (Google, Bing, etc.) |
| `assets/twk-tokens-v3.js` | Tokens pill + streak + grant logic |
| `assets/twk-self-heal.js` | Runtime auto-recovery de estado |
| `assets/twk-thumb-to-video.js` | Cards → /playlist redirect + dedupe |
| `assets/twerkhub-auth.js` | Founder detection + D1 sync |
| `assets/youtube-age-classification.json` | Map de vid → 'public'/'blocked' (665 entries) |
| `DEPLOY-BLINDAJE-V5.ps1` | Deploy orquestrator |
| `PRE-DEPLOY-VALIDATE.ps1` | 5-step pre-deploy gate |
| `_deploy-log.txt` | Log del último deploy (verdad de fuente) |
| `_redirects` | 301s para canibalizaciones |
| `llms.txt` | LLM crawler instructions |
| `account.html` | Founder override + streak display |

---

**Última actualización:** 2026-05-13 03:12 UTC
**Commit del fix definitivo:** `0ff2666e0`
**Cache buster activo:** `v=20260513-blindaje-v68`
