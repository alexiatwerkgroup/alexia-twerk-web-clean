-- TWERKHUB · D1 schema for auth + profiles + tokens + comments + heatmap
-- 2026-05-08 · Migration from Supabase to Cloudflare D1
--
-- Apply via wrangler:
--   wrangler d1 execute twerkhub-subscribers --remote --file=_d1/schema-auth-tokens.sql
--
-- All tables use TEXT IDs (UUIDv4 stored as string) since D1/SQLite has no
-- native uuid type. Timestamps stored as ISO 8601 strings (TEXT) using
-- CURRENT_TIMESTAMP — NOT unix integers, so they sort lexicographically.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. USERS · email + password_hash (replaces Supabase auth.users)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,                          -- UUIDv4
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT NOT NULL,                             -- pbkdf2$iter$salt_b64$hash_b64
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email_verified  INTEGER NOT NULL DEFAULT 0                 -- 0 or 1
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. PROFILES · public profile + token state (replaces public.profiles)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY,                        -- = users.id
  email             TEXT NOT NULL,
  username          TEXT UNIQUE COLLATE NOCASE,              -- nullable until set
  bio               TEXT,
  avatar_url        TEXT,
  tokens            INTEGER NOT NULL DEFAULT 0,
  total_earned      INTEGER NOT NULL DEFAULT 0,
  streak            INTEGER NOT NULL DEFAULT 0,
  last_login_date   TEXT,                                    -- 'YYYY-MM-DD' UTC
  welcomed          INTEGER NOT NULL DEFAULT 0,
  tier              TEXT NOT NULL DEFAULT 'basic',           -- basic|medium|premium|vip
  last_active_at    TEXT,
  registered_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seconds_on_site   INTEGER NOT NULL DEFAULT 0,
  cuts_watched      INTEGER NOT NULL DEFAULT 0,
  last_seen_at      TEXT,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_tokens     ON profiles(tokens DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username   ON profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen  ON profiles(last_seen_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. VIDEO_COMMENTS · per-page comments
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_comments (
  id                TEXT PRIMARY KEY,                        -- UUIDv4
  page_slug         TEXT NOT NULL,
  body              TEXT NOT NULL,
  author_name       TEXT,
  username_snapshot TEXT,                                    -- frozen at post time
  user_id           TEXT,                                    -- nullable for anon
  likes_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_page    ON video_comments(page_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user    ON video_comments(user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- 4. COMMENT_REPORTS · moderation
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_reports (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id        TEXT,
  page_slug         TEXT,
  reason            TEXT,
  reporter_user_id  TEXT,
  reported_user_id  TEXT,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────────────────────
-- 5. VIDEO_HEATMAP · engagement aggregator
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_heatmap (
  video_id     TEXT PRIMARY KEY,
  total_views  INTEGER NOT NULL DEFAULT 0,
  buckets      TEXT NOT NULL DEFAULT '{}',                   -- JSON string
  updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────────────────────
-- 6. USER_VIDEO_VIEWS · per-user view log
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_video_views (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,
  video_slug  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_views_user_vid ON user_video_views(user_id, video_slug);

-- ──────────────────────────────────────────────────────────────────────────
-- 7. SESSIONS · short-lived JWT blocklist (for explicit signout)
--    Optional: only used if we want to invalidate JWTs server-side before exp.
--    For MVP we rely on JWT exp + client-side localStorage clear.
-- ──────────────────────────────────────────────────────────────────────────
-- (intentionally omitted in v1 — JWT stateless)
