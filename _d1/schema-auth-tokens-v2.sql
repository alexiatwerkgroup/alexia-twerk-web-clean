-- TWERKHUB · D1 schema additions for password reset + email verification
-- 2026-05-08 · Phase 4a — Resend integration
--
-- Apply via:
--   wrangler d1 execute twerkhub-subscribers --remote --file=_d1/schema-auth-tokens-v2.sql

-- One-time tokens for password reset / email verification.
-- token_hash = SHA-256 hex of the actual token. We never store the raw token,
-- so a DB compromise doesn't leak active tokens.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash    TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  kind          TEXT NOT NULL,          -- 'password_reset' | 'email_verification'
  expires_at    TEXT NOT NULL,          -- ISO 8601
  used          INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_kind ON auth_tokens(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires   ON auth_tokens(expires_at);

-- email_verified column already exists in users table (added in v1).
-- No-op here, just confirming schema state.
