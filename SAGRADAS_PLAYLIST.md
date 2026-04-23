# 📜 SAGRADAS · PLAYLIST

Canon inmutable para crear o auditar CUALQUIER playlist del sitio.
Orden de arriba hacia abajo = orden de prioridad. Si una regla choca con otra cosa, ganan estas.

---

## 14 SAGRADAS (core)

1. **English only** — cero español en copy / UI / meta / JSON-LD.
2. **No "Anti" dentro de la playlist** (nav, hero, cards, sidebar, CTA). Excepción: footer + bio del home.
3. **Eliminar bloque FOMO** ("Archivo privado · N miembros…"). Ilusión de acceso; paywall solo en acción.
4. **Cards limpios** — solo número (verde) + play (rosa) + thumbnail. Sin shadows, pills, badges, channel, tagline.
5. **Top 5 hot con thumbnails visibles** (no lockeados, no blur).
6. **Hot ranking header literal** = "Hot ranking this week".
7. **Intro alusiva corta inglés** — formato `Curated [theme] cuts · updated every week · handpicked by the hub.`. Sin info-dumps, sin reveal early del paywall.
8. **Sin reveal del paywall anticipado** — la ilusión se rompe SOLO en el click.
9. **Aplica a TODA playlist** — sin excepciones.
10. **Rebuild from scratch** si la playlist ya existe.
11. **No tocar otras playlists** sin luz verde explícita.
12. **Home = visual de /alexia-twerk-test#playlists** — bio text only, video pendiente.
13. **Nav = 6 botones exactos:** `Home · Exclusive · Playlists · Tokens · VR · Profile`.
14. **Memorizar como "reglas básicas playlist"** — set sagrado inmutable.

---

## ⚡ Reglas adicionales 15–21

15. **No "not on YouTube"** — los videos SÍ están en YouTube.
16. **No "exclusive" descriptivo** — solo como label del nav. Insinuar, no afirmar.
17. **Title format único:** `Hottest [theme] videos on YouTube · many +18 only` aplicado a `<title>`, H1, OG, Twitter, JSON-LD.
18. **Nombres de modelos NO** en DOM visible de cards. Solo en JSON-LD para Google.
19. **Nav 6 reafirmado** — ni Twerk Hub ni Del Otro Lado en topbar.
20. **Del Otro Lado eliminada completa** + 410 Gone en `_redirects`.
21. **🔔 Campanita** — cuando Anti necesita acción manual en el repo (push, guardar archivo, renombrar), se crea un task con icono 🔔 visible en el widget Cowork.

---

## 🔒 Paywall / Auth (orden firme)

- Bloqueo total de videos gated hasta que el pago esté live. Solo top 5 hot ranking accesibles.
- "Ya soy miembro" del paywall → **bloqueado**, nunca subscribe automático.
- Cualquier click gated → modal `DM Alexia on Discord` → <https://discord.gg/WWn8ZgQMjn>.
- Stale `subscribed:true` en localStorage **purgado en cada load**.
- Tooltip "Anti" hardcodeado en avatares legacy → neutralizado.

---

## 🛡 Bulletproofing 18-pt (cada playlist nueva)

CSP meta · referrer policy · skip-link · grid-error boundary 8s watchdog · `<noscript>` fallback · external CSS preload async · critical CSS inline · idempotent guard `__twerkhub*Init` · try/catch en init · logging `[twerkhub-leaks]` · iframe `loading=lazy` + `title` + `allow autoplay/enc/pip` · img `decoding=async` · `aria-current` en nav activa · `role="alert"` en boundary · `prefers-reduced-motion` CSS · print styles · cache-bust `?v=YYYYMMDD-pN` · pre-commit validation (HTML balance + JSON-LD parse + checks).

---

## 🔗 Links oficiales

| Canal | URL |
|---|---|
| Discord | <https://discord.gg/WWn8ZgQMjn> |
| Telegram | <https://t.me/+0xNr69raiIlmYWRh> |
| OnlyFans | <https://onlyfans.com/alexiatwerkoficial> |
| Patreon | <https://www.patreon.com/Alexia_Twerk> |
| X / Twitter | <https://x.com/alexiatwerkofic> |

---

## 🧱 Módulos JS que se consumen (NO modificar — patch paralelo si hay bug)

- `/assets/global-brand.js` (auto-inject de los demás)
- `/assets/twerkhub-media.js`
- `/assets/twerkhub-playlist-renderer.js`
- `/assets/twerkhub-titles.js`
- `/assets/twerkhub-paywall.js`
- `/assets/twerkhub-auth-patch.js` (mío · paralelo · bloquea atajos paywall)

**Regla dura:** si encuentro un bug en un módulo legacy → crear un módulo nuevo `twerkhub-*` paralelo. **Jamás patch directo.**

---

## ✅ Pre-commit checklist por playlist

- [ ] `<title>` formato sagrada
- [ ] H1 = 1 visible
- [ ] Nav 6 == `[Home, Exclusive, Playlists, Tokens, VR, Profile]`
- [ ] `body` tiene `twerkhub-pl-clean` + (si aplica) `twerkhub-pl-theater`
- [ ] "Anti" outside footer = 0
- [ ] "not on YouTube" hits = 0
- [ ] "exclusive" total = 1 (nav only)
- [ ] Hot ranking literal = "Hot ranking this week"
- [ ] Intro ≤ 80 chars · sagrada shape
- [ ] 0 paywall-reveal en body (no "DM", "Discord", "lives inside", "real archive")
- [ ] 0 model names visible (DOM no-script)
- [ ] Cero "Del Otro Lado"
- [ ] Cache-bust `?v=YYYYMMDD-pN`
- [ ] CSS brace balance par
- [ ] JSON-LD válido (`CollectionPage` + `ItemList`)
- [ ] HTML balance OK
- [ ] `data-playlist` o pre-rendered cards (theater layout)
