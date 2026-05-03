# TWERKHUB · Supabase Migration Manifest

**Created:** 2026-05-02
**Purpose:** Complete blueprint to rebuild Twerkhub's backend on a different free
provider in under one work session. Lists every table, RPC, RLS policy, env var,
client call site, and auth flow detail so nothing is lost in the move.

> **Read this first if you're migrating away from Supabase.** Then run
> `EXPORT-DATA.sql` from the Supabase SQL Editor to dump live data, and
> follow the per-provider checklist at the bottom.

---

## 1. Current Supabase project (the source)

| Field | Value |
|---|---|
| Project URL | `https://vieqniahusdrfkpcuqsn.supabase.co` |
| Project ref | `vieqniahusdrfkpcuqsn` |
| Region | (check dashboard — was created free tier) |
| Owner email | `alexiatwerkoficial@gmail.com` |
| Anon (public) key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ` |
| Service-role key | NEVER COMMITTED — read from Supabase Dashboard → Project Settings → API |
| Auth flow | PKCE |
| Auth storage key | `alexia-auth-v3` (localStorage) |
| Quota status (2026-05-02) | Egress 232% (12.79GB / 5.5GB), grace until **May 5** |

Hardcoded in `assets/supabase-config.js` and (separately, for legacy reasons)
in `assets/online-count-global.js` and `assets/global-nav-online.js`.

---

## 2. Tables (public schema)

All tables live under `public.*`. The `auth.users` table is Supabase-managed
and gets mirrored into `profiles` via the `handle_new_user` trigger.

### 2.1 `profiles` (the only table users write to directly)
Created originally by Supabase template; extended by v1 + v2 SQL files.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users.id` |
| `email` | text | mirrored from auth.users on signup |
| `username` | text | unique-ish (enforced via `username_available` RPC + leaderboard view) |
| `bio` | text | nullable, profile bio |
| `avatar_url` | text | nullable |
| `created_at` | timestamptz | default `now()` (template column) |
| `tokens` | int | default 0 — current balance |
| `total_earned` | int | default 0 — lifetime |
| `streak` | int | default 0 — daily-login streak |
| `last_login_date` | date | for `claim_daily` |
| `welcomed` | bool | default false — one-time welcome bonus flag |
| `tier` | text | default 'basic' — basic/medium/premium/vip |
| `last_active_at` | timestamptz | bumped by every RPC |
| `registered_at` | timestamptz | default `now()` |
| `seconds_on_site` | bigint | default 0 — heartbeat aggregate |
| `cuts_watched` | int | default 0 — videos opened |
| `last_seen_at` | timestamptz | bumped by `bump_session` RPC |

**Indexes:** `profiles_tokens_idx (tokens desc)`, `profiles_username_idx (lower(username))`, `profiles_last_seen_idx (last_seen_at desc nulls last)`.

### 2.2 `video_comments`
Used by `comments-community-v2.js` and `community-page.js`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid / bigint | PK |
| `page_slug` | text | which page the comment belongs to |
| `body` | text | comment text |
| `author_name` | text | display name at post time |
| `username_snapshot` | text | username at post time (immutable) |
| `user_id` | uuid | FK → profiles.id (nullable for anon) |
| `likes_count` | int | default 0 |
| `created_at` | timestamptz | default now() |

### 2.3 `comment_reports` (moderation)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `comment_id` | uuid/bigint | FK → video_comments.id |
| `page_slug` | text | denormalized for queries |
| `reason` | text | nullable |
| `reporter_user_id` | uuid | nullable |
| `reported_user_id` | uuid | nullable |
| `created_at` | timestamptz | default now() |

### 2.4 `page_visits` (visitor presence — the egress culprit)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `page` | text | `'online'` for global presence |
| `visitor_id` | text | client-generated random id |
| `created_at` | timestamptz | default now() |

**Important:** post-migration, hold this table to a 24h retention window
(`emergency-cleanup-egress.sql` truncates anything older). Or drop it
entirely and replace with a Cloudflare Workers Durable Object counter.

### 2.5 `video_heatmap` (engagement aggregator)
Read by `twerkhub-heatmap.js`. Written via `record_watch` RPC.

| Column | Type | Notes |
|---|---|---|
| `video_id` | text | PK — slug of the video |
| `total_views` | bigint | aggregate counter |
| `buckets` | jsonb | array of percentages or bucket counts |
| `updated_at` | timestamptz | default now() |

### 2.6 `user_video_views` (per-user views, count-only queries)
| Column | Type | Notes |
|---|---|---|
| `id` | bigint | PK |
| `user_id` | uuid | FK → profiles.id |
| `video_slug` | text | which video |
| `created_at` | timestamptz | default now() |

---

## 3. RPC functions (server-side logic)

Defined in `schema-tokens-v1.sql` and `schema-tokens-v2-session-tracking.sql`.

| RPC | Caller | Purpose |
|---|---|---|
| `compute_tier(int)` | internal | maps tokens → basic/medium/premium/vip |
| `grant_tokens(amount int, reason text)` | authenticated | +tokens; clamped 1..1000 |
| `claim_daily()` | authenticated | daily 50 + streak bonus, idempotent per UTC day |
| `claim_welcome()` | authenticated | one-time +200 on first login |
| `username_available(text)` | anon + authenticated | bool — for signup form |
| `email_for_username(text)` | anon + authenticated | for login-by-username |
| `bump_session(seconds_delta int, cuts_delta int)` | authenticated | heartbeat, clamped 0..60s + 0..5 cuts |
| `admin_get_full_stats()` | authenticated, owner-gated | full user list (email + metrics) — silently empty for non-owners |
| `record_watch(vid text, watched int[])` | authenticated | bumps video_heatmap (NOT in committed SQL — applied directly in Supabase Dashboard, **needs to be exported**) |

**Migration note:** `record_watch` was created live in the Supabase SQL editor
and is NOT in the repo. Before migrating, run this in the Supabase SQL editor
and copy the output into a new `schema-record-watch.sql`:
```sql
select pg_get_functiondef('public.record_watch'::regproc);
```

---

## 4. RLS policies (the security model)

Enabled on `profiles`. Other tables: check Supabase Dashboard → Authentication
→ Policies before exporting (anything not committed is at risk of being lost).

`profiles`:
- **SELECT:** `using (true)` — anyone can read every profile (for leaderboard / profile pages). Email is intentionally exposed only on own row at the application layer (not enforced by RLS — keep this in mind on a new provider).
- **UPDATE:** `using (auth.uid() = id) with check (auth.uid() = id)` — own row only.
- **No INSERT policy** — only the `handle_new_user` trigger inserts.
- **No DELETE policy** — clients cannot delete profiles.

Token mutations bypass RLS via `security definer` RPCs (the only path that
can write to `tokens`, `total_earned`, etc.).

---

## 5. Auth configuration

| Setting | Value |
|---|---|
| Providers enabled | Email + password (PKCE flow) |
| Email confirmations | (check dashboard — was disabled at one point for testing) |
| Storage location | localStorage, key `alexia-auth-v3` |
| Username login | implemented via `email_for_username` RPC then `signInWithPassword(email,password)` |
| Owner email (admin gate) | `alexiatwerkoficial@gmail.com` (hardcoded in `admin_get_full_stats`) |
| JWT issuer | `supabase` (from anon key payload) |
| JWT exp | 2088-09-08 (way out, OK to keep using on old provider until cutover) |

---

## 6. Client call sites (what breaks if URL/key changes)

Search the repo for these strings if/when you change the backend URL:

```
SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

Files that hardcode the URL/key (must be edited on cutover):
- `assets/supabase-config.js` — primary
- `assets/online-count-global.js`
- `assets/global-nav-online.js`
- (any file that imports from a CDN URL pointing at Supabase REST)

Files that use the client through `window.supabaseClient` / `window.__alexiaCommentsClient` (only depend on `supabase-config.js`, no edits needed):
- `assets/twerkhub-auth.js` / `twerkhub-auth-fixed.js`
- `assets/profile-page.js`
- `assets/comments-community-v2.js`
- `assets/community-page.js`
- `assets/twerkhub-heatmap.js`
- `assets/session-tracker.js`
- `assets/video-discussion-bars.js`

---

## 7. Migration target — ranked

### Option B1 · **Neon** (Postgres free tier) — **easiest port**
- ✅ Same SQL dialect (Postgres). All `.sql` files run as-is.
- ✅ Free tier: 0.5 GB storage, **5 GB egress per month** (same ballpark as Supabase free, no improvement).
- ❌ **No built-in Auth** — must add Lucia / Auth.js / WorkOS / Clerk free tier.
- ❌ **No PostgREST** — must hand-write a thin REST layer (Cloudflare Worker, Vercel function).
- **Effort:** schema = 0 work. Auth + REST layer = ~6h.

### Option B2 · **Cloudflare D1 + Workers + Cloudflare Access (or DIY JWT)** — **best long-term**
- ✅ **Free tier: 5 GB DB, 100k Worker reqs/day, no per-byte egress charge** at the Worker level. Pages already on Cloudflare = same dashboard.
- ⚠️ D1 is **SQLite**, not Postgres. Need to translate:
  - `uuid` → `text` (store as string)
  - `jsonb` → `text` (parse client-side)
  - `bigint` → `integer`
  - `timestamptz` → `text` (ISO 8601) or `integer` (unix ms)
  - `now()` → `CURRENT_TIMESTAMP`
  - PL/pgSQL RPCs → JS in Workers
- ❌ No PostgREST equivalent. Build a small Worker for each RPC.
- **Effort:** schema port + RPC rewrites = ~10h.
- **Wins:** zero egress charges going forward; Worker-side caching trivial.

### Option B3 · **Turso** (libSQL — SQLite at the edge) — **middle ground**
- ✅ Free tier: 9 GB storage, **1 billion row reads / month**, 25 million writes / month. By far the most generous read tier.
- ⚠️ Same SQLite-vs-Postgres translation as D1.
- ⚠️ Has a basic Auth (`turso db tokens`) but no user-management — still need Lucia-style layer.
- **Effort:** ~10h, similar to D1.

### Option B4 · **Stay on Supabase, upgrade to Pro $25/mo** — **0h effort**
- 250 GB egress, 8 GB DB, no migration. Everything keeps working.

### Option B5 · **Self-host Supabase on a VPS** (Hetzner CX22 €4.50/mo)
- All current SQL + Auth + PostgREST as-is. Higher ops burden.

### **Recommendation**
Given this site is hitting the **egress** ceiling (not storage, not DB CPU), and
Cloudflare Workers don't charge for egress between Workers and the Cloudflare
edge → **Option B2 (Cloudflare D1 + Workers)** removes the bottleneck entirely
and consolidates the stack on Cloudflare. If you want zero migration risk
this week, **Option B4 ($25/mo)** is the boring answer.

---

## 8. Pre-migration checklist (run BEFORE cutover)

1. [ ] **Run** `EXPORT-DATA.sql` (next file in this folder) in Supabase SQL Editor → save the .csv exports.
2. [ ] **Dump** the live `record_watch` RPC (see §3 note) and commit it as `schema-record-watch.sql`.
3. [ ] **Audit** all RLS policies in Supabase Dashboard → Authentication → Policies; commit anything not in the v1/v2 SQL files.
4. [ ] **Export** `auth.users` via Supabase Dashboard → Authentication → Users → Export. Keep the bcrypt password hashes — they only port to a new Supabase or to a custom Postgres-compatible Auth (Lucia can verify Supabase bcrypt with the same scheme).
5. [ ] **Note** all current quotas/usage (Dashboard → Project Settings → Usage) for sizing the new provider.

---

## 9. Cutover playbook

1. Provision the new backend (Neon project, D1 database, or Turso db).
2. Run the schema (translated if needed for SQLite).
3. Import data from the CSVs.
4. Stand up the Auth + REST layer (skip if Neon-with-Supabase-Auth-frontend).
5. Edit `assets/supabase-config.js` + the two hardcoded files in §6 to point to the new URL/key.
6. Deploy a single `?v=` cache-buster bump on every page that loads those scripts (or rely on the existing `?v=` query strings).
7. Watch for 4xx errors in browser DevTools for ~30min, then on Supabase set the project to **paused** (don't delete — keep it as a fallback for 14 days).
8. After 14 days, delete the Supabase project to stop billing forever.

---

## 10. What is intentionally NOT migrating

- The `page_visits` table presence-tracking — this is the egress culprit and should be replaced with a Durable Object counter or just dropped (the UI now serves a session-stable fake count).
- The bcrypt password hashes — only matter if you keep an email+password login. If you switch to passwordless / OAuth-only, ignore them.
- Old session JWTs in users' localStorage (key `alexia-auth-v3`) — they'll become invalid; users will be logged out on cutover. That's acceptable.

---

## 11. Honest difficulty assessment

| Path | Calendar time | Engineering hours | Risk |
|---|---|---|---|
| Stay on Supabase Pro ($25/mo) | 5 minutes | 0.1h | None |
| Migrate to Neon (Postgres) | 1 evening | 6–8h | Low (same SQL) |
| Migrate to Cloudflare D1 + Workers | 2 evenings | 10–14h | Medium (SQLite port + Auth rewrite) |
| Migrate to Turso | 2 evenings | 10–14h | Medium |
| Self-host Supabase | 1 weekend | 12–20h | High (you become the DBA) |

The migration is **not technically hard** — every table fits in a single
schema file and the auth model is standard. The risk is the **two-day
deadline** before May 5. If we miss it the site returns HTTP 402 on Supabase
calls, which kills login + comments + token rewards but does NOT kill the
static site (videos still play, navigation still works).

**Safe play:** pay $25 for one month → migrate calmly to Cloudflare D1 over
the next 2 weekends → cancel Supabase Pro before next renewal.

