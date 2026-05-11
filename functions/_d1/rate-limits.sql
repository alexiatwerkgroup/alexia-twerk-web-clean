-- Rate Limits Table Schema
-- Tracks API usage to prevent brute force, spam, and abuse
-- v20260511

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for window_start queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS rate_limits_update_ts
AFTER UPDATE ON rate_limits
BEGIN
  UPDATE rate_limits SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
END;

-- Sample cleanup query (run daily):
-- DELETE FROM rate_limits WHERE window_start < strftime('%s', 'now', '-7 days');
