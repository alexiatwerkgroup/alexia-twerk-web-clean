# TWERKHUB · Cloudflare D1 Migration Status

**Last updated:** 2026-05-08

## ✅ Phase 1 + 2 + 3 — DONE (code-wise)

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
- `GET  /api/profile/me`               — read own profile (+email)
- `POST /api/profile/me`               — update username/bio/avatar_url
- `GET  /api/profile/[id]`             — public profile by UUID OR username

### Token economy endpoints
- `POST /api/tokens/claim-daily`       — daily 50 + streak bonus, idempotent UTC
- `POST /api/tokens/claim-welcome`     — one-time +200
- `POST /api/tokens/grant`             — generic +tokens (clamped 1..1000)
- `POST /api/session/bump`             — heartbeat (clamped 0..60s + 0..5 cuts)

### Comments endpoints
- `GET  /api/comments?page=:slug`      — list (public read)
- `POST /api/comments`                 — post comment (auth, rate-limited 1/5s)
- `DELETE /api/comments/[id]`          — delete own (or admin)
- `POST /api/comments/report`          — file moderation report

### Heatmap endpoints
- `POST /api/heatmap/record`           — record_watch, upserts buckets JSON
- `GET  /api/heatmap/[video_id]`       — read heatmap (5min cache)

### Admin endpoints
- `GET  /api/admin/full-stats`         — owner-only (silent empty for others)

### Frontend integration
- `assets/supabase-config.js`:
  - **auth.signInWithPassword/signUp/signOut/getSession/getUser** → endpoints reales
  - **rpc('claim_daily' | 'claim_welcome' | 'grant_tokens' | 'bump_session' | 'username_available' | 'record_watch' | 'admin_get_full_stats')** → routed
  - **window.TwkAPI** namespace — clean direct methods (recommended for new code)
  - **from(table)** — todavía stub vacío (see Phase 4 below)

## ⏳ Phase 4 — pending (medium priority)

### `from()` table compat layer
Existing client code uses `__twkSupabase.from('profiles').select().eq('id', X).single()` etc. The chainable query builder is currently STUBBED (returns empty results).

**Options to migrate:**
1. **Best:** rewrite consuming files (twerkhub-auth.js, profile-page.js, comments-community-v2.js, etc.) to use `window.TwkAPI.*` directly. Cleaner code, easier to debug.
2. **Quick:** implement a minimal chainable from() that maps to /api/* endpoints. Brittle for unsupported queries.

Files that consume `from()`:
- `assets/twerkhub-auth.js` / `twerkhub-auth-fixed.js`
- `assets/profile-page.js`
- `assets/comments-community-v2.js`
- `assets/community-page.js`
- `assets/twerkhub-heatmap.js`
- `assets/session-tracker.js`
- `assets/video-discussion-bars.js`

**Recommended migration plan:**
1. Replace `__twkSupabase.from('profiles')...` calls with `TwkAPI.profile.*`
2. Replace `__twkSupabase.from('video_comments')...` with `TwkAPI.comments.*`
3. Replace `__twkSupabase.from('video_heatmap')...` and `rpc('record_watch')` with `TwkAPI.heatmap.*`
4. Once all migrated, remove the `from()` stub entirely

### Storage / file uploads (avatars)
- `__twkSupabase.storage.*` is stubbed with errors. Cloudflare R2 would be the
  natural target. Defer until needed.

### Password reset / email verification / OAuth
- Not implemented. Site doesn't support these as essential flows.
- If needed later: integrate Resend or Postmark for transactional email.

## 🚀 Deploy checklist

```powershell
cd C:\Users\Claudio\OneDrive\Desktop\proyectos\alexia-twerk-web-clean

# 1. Schema applied? (one-time)
wrangler d1 execute twerkhub-subscribers --remote --file=_d1/schema-auth-tokens.sql

# 2. JWT_SECRET set in dashboard? (one-time, encrypted)
wrangler pages secret put JWT_SECRET --project-name=alexia-twerk-web-clean

# 3. Deploy
git add -A
git commit -m "feat(auth): Cloudflare D1 migration Phase 1+2+3 complete"
git push
```

## 🧪 Smoke tests

Browser DevTools → Console after deploy:

```js
// Auth
const u1 = await TwkAPI.auth.signup({ email:'test@a.com', password:'hunter22', username:'user1' });
console.log('signup:', u1);

const u2 = await TwkAPI.auth.signin({ email:'test@a.com', password:'hunter22' });
console.log('signin:', u2);

const s = await TwkAPI.auth.session();
console.log('session:', s);

// Tokens
const w = await TwkAPI.tokens.claimWelcome();
console.log('welcome:', w);

const d = await TwkAPI.tokens.claimDaily();
console.log('daily:', d);

// Profile
const me = await TwkAPI.profile.me();
console.log('me:', me);

// Comments
const c1 = await TwkAPI.comments.post('test-page', 'Hello world');
console.log('post:', c1);

const cl = await TwkAPI.comments.list('test-page');
console.log('list:', cl);

// Heatmap
const h = await TwkAPI.heatmap.record('test-video', [0,1,2,3,4]);
console.log('heatmap:', h);
```

If all return `ok:true` → 🎉 fully migrated.

## 💰 Cost projection

| Resource | Free tier | Expected usage | Headroom |
|---|---|---|---|
| D1 storage | 5 GB | <10 MB | 99.8% free |
| D1 reads/day | 5M | <10k | 99.8% free |
| D1 writes/day | 100k | <1k | 99% free |
| Pages Functions/day | 100k | <50k | 50% free |
| Egress | unlimited | — | ∞ |

**Total: $0/mo** (vs $25/mo Supabase Pro that would have been needed).
