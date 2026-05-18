# TWERKHUB · D1 Migration Phase 1 (Auth) · 2026-05-08

**Estado actual:** Auth funcionando en Cloudflare D1 + Pages Functions.
Comments / tokens / heatmap → Phase 2.

## Lo que YA está listo en el código

```
_d1/
  schema-auth-tokens.sql           ← schema D1 (correr una vez)

functions/
  _lib/
    auth.js                        ← JWT + PBKDF2 (Web Crypto, sin deps)
    http.js                        ← CORS + JSON helpers
  api/
    auth/
      signup.js                    ← POST /api/auth/signup
      signin.js                    ← POST /api/auth/signin
      session.js                   ← GET  /api/auth/session
      signout.js                   ← POST /api/auth/signout
      username-available.js        ← GET  /api/auth/username-available?u=foo

assets/
  supabase-config.js               ← reemplazado: ahora apunta a /api/auth/*
```

## Lo que VOS tenés que hacer (3 pasos · 10 min total)

### Paso 1 — Crear las tablas en D1 (2 min)

Abrí PowerShell en el repo:

```powershell
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean

# si no tenés wrangler instalado:
npm install -g wrangler

# loguearte (abre browser):
wrangler login

# Aplicar schema en la D1 REMOTA:
wrangler d1 execute twerkhub-subscribers --remote --file=_d1/schema-auth-tokens.sql
```

Te tira algo como `🌀 Mapping SQL input into an array of statements... ✅ Successfully executed`.
Si ves error de "table already exists" en alguno, ignoralo (las tablas son `IF NOT EXISTS`).

### Paso 2 — Generar y guardar el JWT_SECRET (3 min)

Generá un secret fuerte:

```powershell
# PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Copiá el output (algo tipo `XYZabc123...=`).

Agregalo a **Cloudflare Pages dashboard**:
1. https://dash.cloudflare.com → tu cuenta → Workers & Pages
2. Click el proyecto `alexia-twerk-web-clean`
3. Settings → **Environment variables**
4. Click **Add variable** → en **Production**:
   - Variable name: `JWT_SECRET`
   - Value: (pega el string que generaste)
   - **Encrypt** → ✅ (importante! marcalo)
5. **Save**

(Si querés también lo agregás en Preview pero para production es lo mínimo).

### Paso 3 — Push y deploy (2 min)

```powershell
git add -A
git commit -m "feat(auth): migrate Supabase auth to Cloudflare D1 + Pages Functions"
git push
```

Cloudflare Pages auto-deploya. Esperá ~2 min al build.

### Paso 4 — Probar (3 min)

1. Hard refresh en `https://alexiatwerkgroup.com`
2. Click **Sign Up** (la primera vez no tenés usuario en D1, hay que crear uno nuevo)
3. Ingresá email + password
4. Si ves "signed up" sin errores → 🎉 funciona

Si ves error en consola (F12 → Console), pasame screenshot.

## Endpoints disponibles AHORA

| Método | Path | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| POST | `/api/auth/signup` | `{email, password, username?}` | `{ok, user, token}` + cookie |
| POST | `/api/auth/signin` | `{email, password}` o `{username, password}` | `{ok, user, token}` + cookie |
| POST | `/api/auth/signout` | — | `{ok}` |
| GET  | `/api/auth/session` | (Bearer/cookie) | `{ok, user}` |
| GET  | `/api/auth/username-available?u=NAME` | — | `{ok, available}` |

## Lo que NO funciona todavía (Phase 2 pendiente)

Estos features están **stubbed** (no rompen, retornan vacío):

- ❌ Token economy server-side (claim daily, claim welcome, grant tokens)
  - **Workaround:** los tokens viven en localStorage como antes (`alexia_tokens_v1.balance`)
- ❌ Comments (`video_comments` table existe pero no hay endpoints aún)
- ❌ Heatmap server-side
- ❌ User_video_views logging
- ❌ Password reset / email verification / OAuth
- ❌ Storage de imágenes (avatares se quedan en localStorage o broken)

## Roadmap Phase 2 (próximas sesiones)

1. `/api/profile/me` GET + POST (read + update propio)
2. `/api/profile/[id]` GET (público)
3. `/api/tokens/claim-daily`, `/api/tokens/claim-welcome`, `/api/tokens/grant`
4. `/api/comments` CRUD
5. `/api/heatmap/record` POST + `/api/heatmap/[video_id]` GET
6. Update from()/rpc() compat shim en supabase-config.js para que use estos endpoints

## Costo running

- **D1**: 5 GB storage + 5M reads/día gratis (vamos a estar muy lejos del límite con 18 MAU)
- **Pages Functions**: 100k invocaciones/día gratis (más que suficiente)
- **Egress**: $0 — Cloudflare no cobra egress entre Workers y el edge

**Total mensual esperado: $0.**

## Rollback (si algo sale mal)

Para volver al stub temporal:

```powershell
git revert HEAD
git push
```

O para volver a Supabase original (cuando se resetee el quota el 10 May):

```powershell
git log --oneline assets/supabase-config.js | head -5
git checkout <commit-anterior-al-stub> -- assets/supabase-config.js
git push
```
