# TIKTOK · Plan de 14 días para TWERKHUB

## OBJETIVO
Convertir tu archivo de YouTube en tracción de TikTok hacia alexiatwerkgroup.com.
**Meta realista**: 50–500K views totales en 14 días + 1–3 clips virales (>100K views).

---

## SETUP INICIAL (1 día)

### Cuenta TikTok
- Username: `@alexiatwerkgroup` (si está libre) o `@twerkhub.archive`
- Foto: el logo TWERKHUB que tenés en `/logo-twerkhub.png`
- Bio (max 80 chars):
  > Twerk archive · 1500+ 4K cuts · weekly drops 🔗 alexiatwerkgroup.com
- Link en bio: alexiatwerkgroup.com (cuando tengas 1000 followers se desbloquea Linktree-style)

### Antes de empezar
- Cambiá el clima de la cuenta a **modo Negocio** (Settings → Manage Account → Switch to Business)
  → te da analytics free
- Activá **Save to Device** = OFF (TT penaliza si exportan los clips para repost)

---

## SCHEDULE 14 DÍAS (3 clips/día = 42 posts)

### Días 1–3: BURN (calentar el algo)
- Subí los 5 clips iniciales del manifest, después extendé el manifest
- Posteá 3x/día: 12pm, 7pm, 10pm AR (UTC-3)
- NO uses link en caption los primeros 3 días — TT castiga
- Captions cortos, hook fuerte primer linea

### Días 4–7: ITERATE
- Mirá analytics: cuáles clips pasaron 5K views? Esos son tu "estilo ganador"
- Re-cortá variaciones de los winners (mismo video, ángulo distinto, hook distinto)
- Empezá a comentar en TT de creadores nicho (twerk, dance, kpop) para activar visibilidad

### Días 8–14: SCALE
- Doblá la cantidad de clips del estilo que funcionó
- Después del clip #20, agregá CTA suave: "más en mi link" o "archive in bio"
- Si algún clip pasa 50K, BOOST con $10 USD el mismo día (TT Promote, retorno típico 3–8x en views)

---

## CAPTION FORMULA (copiar-pegar)

```
[HOOK 5-7 PALABRAS] · [MICROCONTEXTO]

[3-5 hashtags amplios]
[3-5 hashtags nicho]
[1 hashtag SEO long-tail propio]
```

### Ejemplos para tus 5 clips iniciales

**Clip #1 (Lada Gozzi heels Moscow)**
```
The Moscow heels cut everyone copies but no one names ↓

#twerk #heelschoreo #fyp #foryoupage #dance
#moscowdance #russiandance #ladagozzi
#twerkhubarchive
```

**Clip #2 (Try-on)**
```
Drop you wont find on YT (link in bio)

#twerk #tryon #fyp #dance #fashion
#archive #4k #weeklydrop
#twerkhubarchive
```

**Clip #3 (Cosplay fancam)**
```
Cosplay fancam Tokyo · 4K cut

#cosplay #fancam #tokyo #fyp #anime
#cosplaygirl #4kdance #cosplaytiktok
#twerkhubarchive
```

**Clip #4 (K-pop top 5)**
```
K-pop twerk top 5 — full playlist link in bio

#kpop #kpoptwerk #fyp #foryoupage
#seoul #kpopdance #korea #kpopfyp
#twerkhubarchive
```

**Clip #5 (Premium Latin)**
```
#021 of the Latin vault

#latina #twerk #reggaeton #fyp #perreo
#buenosaires #colombia #latinatok
#twerkhubarchive
```

---

## QUE NO HACER

- ❌ Subir clips con nudity o "sexually suggestive" → ban inmediato
- ❌ Linkear directo a OF / Patreon / paywalls → shadowban
- ❌ Meter watermark gigante → algo TT entierra clips con watermark dominante
- ❌ Postear el mismo clip 2x (aún con caption distinto) → spam flag
- ❌ Subir todo el mismo día → algo te pone en pause

---

## METRICAS A MIRAR (TT analytics)

Cada 3 días, anotá:
- **Views** totales de los últimos 3 clips
- **Avg watch time %** (apuntá >50% = TT te boostea)
- **Profile visits** (los que entran a tu perfil → tu sitio)
- **Link clicks** (los que click el link de bio → conversión real)

Si después de día 7 el avg watch time es <30% → cambiá hooks.
Si son >60% → estás en flow, doblá producción.

---

## EXTENDER EL MANIFEST

Después de los primeros 5 clips, abrís `clips-manifest.csv` y agregás 1 línea por video que quieras procesar:

```csv
youtube_id,start_seconds,duration_seconds,title,caption,hashtags
ABC123XYZ,45,15,Mi clip ejemplo,"hook line aca","#twerk #fyp #dance"
```

Después corrés `python generate-tiktok-clips.py` y procesa solo los nuevos (skip los que ya están en `output/`).

**Tip de selección**: por cada video largo que tengas, mirá la curva de retención en YT analytics, encontrá el peak (donde menos gente abandona) y usá ese segundo +/- 15s.
