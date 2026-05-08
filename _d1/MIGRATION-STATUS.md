# TWERKHUB · Cloudflare D1 Migration Status

**Last updated:** 2026-05-08

## ✅ Phase 1 + 2 — DONE (code-wise)

### Library
- `functions/_lib/auth.js` — JWT (HS256) + PBKDF2 password hashing (Web Crypto)
- `functions/_lib/http.js` — CORS + JSON helpers
- `functions/_lib/tier.js` — token → tier resolver

### Auth endpoints
- `POST /api/auth/signup`              — create user + profile
- `POST /api/auth/signin`              — email or username + password
- `POST /api/auth/signout`             — clear cookie
- `GET  /api/auth/session`             — validate JWT, return current user
- `GET  /api/auth/username-available?u=` — check uniqueness

### Profile endpoints
- `GET  /api/profile/me`               — read own profile
- `POST /api/profile/me`               — update username/bio/avatar_url

### Token economy endpoints (replaces Supabase RPCs)
- `POST /api/tokens/claim-daily`       — daily 50 + streak bonus, idempotent
- `POST /api/tokens/claim-welcome`     — one-time +200
- `POST /api/tokens/grant`             — generic +tokens (clamped 1..1000)
- `POST /api/session/bump`             — heartbeat (clamped 0..60s + 0..5 cuts)

### Frontend integration
- `assets/supabase-config.js` rewritten:
  - `auth.signInWithPassword()` → `/api/auth/signin`
  - `auth.signUp()` → `/api/auth/signup`
  - `auth.signOut()` → `/api/auth/signout`
  - `auth.getSession()` / `getUser()` → `/api/auth/session`
  - `rpc('claim_daily')` → `/api/tokens/claim-daily`
  - `rpc('claim_welcome')` → `/api/tokens/claim-welcome`
  - `rpc('grant_tokens', {amount, reason})` → `/api/tokens/grant`
  - `rpc('bump_session', {seconds_delta, cuts_delta})` → `/api/session/bump`
  - `rpc('username_available', {text})` → `/api/auth/username-available`

### Schema
- `_d1/schema-auth-tokens.sql` — all tables (users, profiles, video_comments,
  comment_reports, video_heatmap, user_video_views)

## ⏳ Phase 3 — NOT YET (these still stubbed in client)

| Feature | Endpoint to build | Caller |
|---|---|---|
| Public profile read | `GET /api/profile/[id]` | profile-page.js |
| Comments list | `GET /api/comments?page=` | comments-community-v2.js |
| Comments post | `POST /api/comments` | comments-community-v2.js |
| Comments delete | `DELETE /api/comments/[id]` | community-page.js |
| Comments report | `POST /api/comments/[id]/report` | community-page.js |
| Heatmap read | `GET /api/heatmap/[video_id]` | twerkhub-heatmap.js |
| Heatmap record | `POST /api/heatmap/record` | twerkhub-heatmap.js |
| Admin full stats | `GET /api/admin/full-stats` (gated by owner email) | admin-users.html |
| Email-for-username | `GET /api/auth/email-for-username?u=` | (already handled by /api/auth/signin accepting username) |
| Password reset | `POST /api/auth/reset-password` | account.html (deferred) |

The `from('table').select()` chain in `supabase-config.js` returns empty
results until Phase 3, so callers using direct table reads (e.g.
`from('profiles').select().eq('id', X)`) will see empty arrays. Need to
migrate those to direct `fetch('/api/profile/[id]')` calls.

## 🚀 Deploy checklist (do this NOW to go live)

```powershell
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean

# 1. Install wrangler if needed
npm install -g wrangler
wrangler login

# 2. Apply schema to remote D1
wrangler d1 execute twerkhub-subscribers --remote --file=_d1/schema-auth-tokens.sql

# 3. Set JWT_SECRET (do this in dashboard:
#    Pages → alexia-twerk-web-clean → Settings → Environment variables
#    Add JWT_SECRET as encrypted, value = 48 random bytes base64)
#    Or via CLI:
wrangler pages secret put JWT_SECRET --project-name=alexia-twerk-web-clean
# (paste the secret when prompted)

# 4. Push code
git add -A
git commit -m "feat(auth): full Cloudflare D1 migration - Phase 1 (auth) + Phase 2 (tokens, profile)"
git push

# 5. Wait ~2 min for Cloudflare deploy, then hard-refresh alexiatwerkgroup.com
```

## 🧪 Smoke tests after deploy

Open browser DevTools → Console, paste:

```js
// Test 1: signup new user
const r1 = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'hunter22', username: 'testuser1' })
}).then(r => r.json());
console.log('signup:', r1);

// Test 2: signin
const r2 = await fetch('/api/auth/signin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'hunter22' })
}).then(r => r.json());
console.log('signin:', r2);

// Test 3: session (should return user)
const r3 = await fetch('/api/auth/session', {
  headers: { 'Authorization': 'Bearer ' + r2.token }
}).then(r => r.json());
console.log('session:', r3);

// Test 4: claim daily (uses cookie)
const r4 = await fetch('/api/tokens/claim-daily', {
  method: 'POST',
  credentials: 'include'
}).then(r => r.json());
console.log('claim daily:', r4);
```

If r1.ok = true, r2.token exists, r3.user is non-null, and r4.granted = 50+ → 🎉 working.

## 💰 Cost projection

- D1 free tier: 5 GB storage + 5M reads/day → way under for 18 MAU
- Pages Functions: 100k requests/day free → way under
- Workers: $0 egress
- **Total: $0/mo**
