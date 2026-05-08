# GA4 Internal Traffic — Setup completo

**Project**: alexiatwerkgroup.com
**GA4 Property ID**: G-YSFR7FHCLS
**Set up date**: 2026-05-08
**Anti's IP (al 2026-05-08)**: `181.21.19.236`

## Por qué esto importa

El tráfico de testing/debugging de Anti (IP de Argentina, Buenos Aires) está
contaminando reportes de country, city, engagement y retention. Esta
configuración lo aísla limpiamente sin afectar tráfico real externo.

---

## Capa 1 — IP-based Internal Traffic Rule (estándar GA4)

### Pasos en GA4 Admin

1. Login: https://analytics.google.com/
2. ⚙️ **Admin** (abajo izquierda)
3. Property column → **Data streams**
4. Click el stream `alexiatwerkgroup.com` (G-YSFR7FHCLS)
5. Bajá a **Configure tag settings** → click
6. **Show all** (desplegable)
7. **Define internal traffic** → **Create**
8. Llenar:
   - **Rule name**: `My Internal Traffic`
   - **traffic_type value**: `internal` (default — no tocar)
   - **Match type**: `IP address equals`
   - **Value**: `181.21.19.236`  ← tu IP actual confirmado
9. **Create**

### Mantenimiento

Cuando cambie tu IP (router reset, ISP rotation, conexión nueva):
1. Volvé a https://api.ipify.org
2. Copiá el nuevo IP
3. GA4 → Admin → Data Streams → Configure tag settings → Define internal
   traffic → Edit your "My Internal Traffic" rule
4. Agregá un nuevo IP o reemplazá el viejo

**Tip**: podés agregar MULTIPLES IPs a la misma rule (uno por línea).
Si conocés tu rango ISP, también acepta CIDR (ej: `190.123.0.0/16`).

---

## Capa 2 — Cookie/localStorage fallback (BLINDADO contra IP dinámica)

Ya está implementado en `index.html` líneas 83-101. Cuando tu browser tiene
`localStorage.twk_internal_traffic === '1'` o cookie `twk_internal=1`, el
gtag config envía `traffic_type=internal` automáticamente en cada hit.

### Cómo activarlo en tu browser de testing

**Método A — Bookmarklet (recomendado):**

1. Crea un bookmark nuevo en tu barra de favoritos
2. Como URL pegá EXACTAMENTE este código (incluyendo `javascript:`):

```
javascript:(function(){localStorage.setItem('twk_internal_traffic','1');document.cookie='twk_internal=1; path=/; max-age=31536000; samesite=lax';alert('GA4 INTERNAL TRAFFIC ACTIVADO\\n\\nTus visitas a alexiatwerkgroup.com\\nahora se marcan como traffic_type=internal\\ny seran excluidas por el Data Filter.\\n\\nVerificalo en Realtime → user properties.');})();
```

3. Andá a `https://alexiatwerkgroup.com/`
4. Click el bookmarklet UNA VEZ
5. Listo — todas tus visitas futuras quedan flagged

**Método B — DevTools manual** (si no podés usar bookmarklets):

1. F12 en alexiatwerkgroup.com → tab Console
2. Pegá:
   ```js
   localStorage.setItem('twk_internal_traffic', '1');
   document.cookie = 'twk_internal=1; path=/; max-age=31536000; samesite=lax';
   ```
3. Enter

### Para DESACTIVAR (volver a ser tráfico normal)

Bookmarklet de undo:

```
javascript:(function(){localStorage.removeItem('twk_internal_traffic');document.cookie='twk_internal=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';alert('GA4 internal flag REMOVIDO. Tus visitas vuelven a contar como traffic externo.');})();
```

---

## Capa 3 — Data Filter (TESTING → ACTIVE)

GA4 ya viene con un Data Filter llamado "Internal Traffic" pero está en
estado `Inactive` por default. Hay que activarlo en 2 pasos:

### Paso A — Modo TESTING (verificación)

1. GA4 → ⚙️ **Admin**
2. Property column → **Data filters**
3. Find `Internal Traffic` (o creá uno nuevo si no existe):
   - **Filter name**: `Internal Traffic`
   - **Filter operation**: `Exclude`
   - **Parameter name**: `traffic_type`
   - **Parameter value**: `internal`
4. **Filter state**: cambiar de `Inactive` a `Testing`
5. **Save**

En modo TESTING:
- Los hits de internal traffic LLEGAN a GA4 normalmente
- Pero quedan ETIQUETADOS con `traffic_type=internal`
- Podés VER cuántos hay (en reports filtrá por traffic_type)
- Cero impacto en data real

### Paso B — Verificación

1. Activá tu flag (bookmarklet o IP rule)
2. Visitá tu sitio
3. GA4 → **Reports** → **Realtime**
4. Andá a la sección "User properties" o filtrá los eventos
5. Buscá tus visitas — debe aparecer `traffic_type=internal` en los hits

**Otra forma de verificar:**
- Reports → Library → Create comparison
- Add comparison: `traffic_type` = `internal` vs `not internal`
- Si tus visitas caen en la columna "internal", funciona ✓

### Paso C — Activar (ACTIVE)

Una vez verificado:

1. Admin → Data filters → `Internal Traffic`
2. Cambiar de `Testing` a `Active`
3. **Save**

A partir de ese momento:
- Hits con `traffic_type=internal` NO entran a tus reports
- Country/city reports limpios
- Engagement metrics solo de tráfico real
- Pageviews / retention reflejan users de verdad

---

## Verificación post-deploy

Después de pushear el cambio del `index.html` y que se active la Layer 2:

```powershell
# En PowerShell o cualquier terminal con curl
curl -A "Mozilla/5.0" "https://alexiatwerkgroup.com/" -o /tmp/test.html
grep "traffic_type" /tmp/test.html
```

Debería aparecer la lógica del flag en el HTML servido.

---

## Lo que NO se rompió

- ✅ Existing custom events siguen disparándose normal
- ✅ pageview, scroll, click, video tracking — intactos
- ✅ Conversion events — intactos
- ✅ Para tráfico externo: SIN cambio (el flag interno solo aplica si vos lo seteás en tu browser)
- ✅ Performance: cero overhead extra (un check de localStorage = <1ms)

---

## Tracking del state

| Capa | Trigger | Funciona si IP cambia? |
|---|---|---|
| Layer 1 (IP rule) | IP equals X.X.X.X | ❌ no — hay que actualizar |
| Layer 2 (cookie/localStorage) | flag en tu browser | ✅ sí — ATA hasta clear cookies |
| Layer 3 (Data Filter) | excluye traffic_type=internal | siempre, depende de Layer 1+2 |

Las 3 capas en conjunto = filtrado profesional, redundante, antifragil.
