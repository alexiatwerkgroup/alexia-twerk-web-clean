# TWERKHUB — Memoria del proyecto

Sitio estático (Cloudflare Pages) · repo `alexiatwerkgroup/alexia-twerk-web-clean` · dominio **twerkhub.lat**.
Deploy = push a `main`. Cache: `_headers` en `max-age=0, must-revalidate` (en Chrome forzar Ctrl+Shift+R tras deploy).

---

# REGLAS SAGRADAS PARA PUBLICAR PLAYLISTS Y VIDEOS (INQUEBRANTABLES)

Permanentes y NO negociables para cualquier actualización de playlists/videos.

**REGLA 1 — Paywall para videos +18.** Todo video marcado +18 en YouTube DEBE tener paywall automático: acceso bloqueado, candado visible en la miniatura, estado premium correcto, sin bypass accidental.

**REGLA 2 — Estado "Viewed" y lock en miniaturas.** Videos vistos: sombreado de visto + píldora/tag "Viewed". Videos con paywall: candado sobre la miniatura + estado visual premium. Los estados deben cargar rápido, consistentes y sin bugs.

**REGLA 3 — Escudo anti-escape de YouTube.** Siempre aplicar el sistema anti-escape. ANTES de deployar: inspeccionar todo el código, borrar código viejo, borrar implementaciones duplicadas, borrar sistemas legacy. UNA sola implementación limpia. Sin conflictos ocultos.

**REGLA 4 — Controles encima del escudo.** Los controles de reproducción SIEMPRE funcionan por encima del escudo. Verificar z-index, clics, interacción mobile y fullscreen. Sin código duplicado / viejo / superpuesto.

**REGLA 5 — Eliminar videos borrados.** Antes de generar playlists: verificar que todos los videos existan; eliminar borrados/privados/no disponibles; NUNCA incluir entradas rotas.

**REGLA 6 — Verificación profunda.** Para cada cambio/feature: (1) investigar la mejor implementación, (2) verificar online si hace falta, (3) confirmar que funciona, (4) testear desktop + mobile, (5) incógnito, (6) interacciones, (7) impacto en performance. Si algo falla: NUNCA dejar fixes parciales, parches temporales ni sistemas inestables.

**REGLA 7 — Inicio de videos.** Todos los videos de playlists arrancan automáticamente en el **segundo 5**. Sin excepciones.

**REGLA 8 — Eliminar completamente el logo de YouTube.** Aplicar zoom/crop hasta que NO quede rastro del logo de YouTube, ni restos visuales, ni bordes raros. Limpio en desktop, mobile y fullscreen.

**REGLA 9 — Top 5 de la derecha.** Siempre actualizar las miniaturas del Top 5 derecho. Deben coincidir con la playlist real de YouTube provista; nunca thumbnails incorrectas/viejas; verificar manualmente antes de publicar.

**REGLA DE ORO (antes de cada push/deploy).** Inspeccionar manualmente todo: zoom, controles, escudo anti-YouTube, paywall, thumbnails, y que NO exista código duplicado o viejo. NUNCA fixes temporales. NUNCA sacrificar estabilidad. NUNCA romper sistemas que ya funcionan. **Estándar Twerkhub = robustez nivel YouTube.**

---

# PROCEDIMIENTO TÉCNICO — actualizar/crear una playlist

Sistema data-driven. NO editar el HTML a mano.

1. **Editar datos** en `_playlist_data/playlist-data-<slug>.json`:
   - try-on → `playlist-data-try-on-hot-leaks.json`
   - cosplay → `playlist-data-hottest-cosplay-fancam.json`
   - korean/k-pop → `playlist-data-korean-girls-kpop-twerk.json`
   - TTL latinas (VIP) → `playlist-data-ttl-latin-models.json`
   - archivo 4K VIP → `playlist-data-private-4k-archive-vip.json`
   - Formato: `{ slug, name, hero, playlist_id, videos:[ {"id":"<YouTube 11-char>", "title":"..."} ], count }`. Actualizar `count`.
2. **Regenerar HTML**: `python3 rebuild_4_playlists.py` (usa el template `playlist/index.html`).
3. **Verificar contra las Reglas Sagradas** (1–9 + Regla de Oro) en desktop/mobile/incógnito ANTES de pushear. En especial: videos rotos eliminados (R5), arranque en seg. 5 (R7), sin logo YT (R8), paywall +18 (R1), Top 5 correcto (R9), una sola implementación del escudo/controles (R3, R4).
4. **SIEMPRE actualizar los contadores (automático, sin que me lo pidan).** Al agregar/quitar videos hay que sincronizar TODOS los números que muestran la cantidad, en TODAS partes:
   - En la página de la playlist: el hero `All <em>N</em> ... cuts.` (N = cantidad real de tarjetas `vcard`).
   - En el **home** (`index.html`), la tarjeta promo de esa playlist: `N cuts · <categoría>` y `N carefully curated drops` (y cualquier `N videos`/`N cuts` que la referencie).
   - Revisar cross-links en otras páginas que muestren "N videos/cuts" de esa playlist.
   Nunca dejar un contador viejo (ej. quedó "191"/"53" cuando ya eran 285). Verificar que no quede el número anterior en ningún lado.
5. **Push**: `git add` del JSON + carpeta de playlist regenerada → commit → `git push origin main`.

**A confirmar siempre:** el script escribe en carpetas `playlist-*`, pero el home linkea a `/try-on-hot-leaks/`, `/hottest-cosplay-fancam/`, `/korean-girls-kpop-twerk/`, `/ttl-latin-models/`. Verificar cuál carpeta sirve la URL pública antes de regenerar, para no actualizar la equivocada.

Archivos clave: `rebuild_4_playlists.py`, `playlist/index.html` (template), `assets/twerkhub-playlist-renderer.js` (render/anonimizado), `assets/youtube-age-classification.json` (marca videos +18 → paywall, Regla 1).
