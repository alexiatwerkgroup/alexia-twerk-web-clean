-- Database optimization: indexes and query performance improvements
-- Apply with: wrangler d1 execute twerkhub-subscribers --remote --file=_d1/indexes-and-optimization.sql

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_username
  ON users(username)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users(created_at DESC);

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id
  ON profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tier
  ON profiles(tier);

-- ============================================================================
-- VIDEO_COMMENTS TABLE INDEXES (frequent queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_video_id
  ON video_comments(video_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
  ON video_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_video_user
  ON video_comments(video_id, user_id);

CREATE INDEX IF NOT EXISTS idx_comments_created_at
  ON video_comments(created_at DESC);

-- ============================================================================
-- COMMENT_REPORTS TABLE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_reports_comment_id
  ON comment_reports(comment_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
  ON comment_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_status
  ON comment_reports(status)
  WHERE status NOT IN ('resolved', 'rejected');

-- ============================================================================
-- VIDEO_HEATMAP TABLE INDEXES (frequent queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_heatmap_video_id
  ON video_heatmap(video_id);

CREATE INDEX IF NOT EXISTS idx_heatmap_video_bucket
  ON video_heatmap(video_id, bucket_index);

-- ============================================================================
-- USER_VIDEO_VIEWS TABLE INDEXES (analytics queries)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_views_user_id
  ON user_video_views(user_id);

CREATE INDEX IF NOT EXISTS idx_views_video_id
  ON user_video_views(video_id);

CREATE INDEX IF NOT EXISTS idx_views_user_video
  ON user_video_views(user_id, video_id);

CREATE INDEX IF NOT EXISTS idx_views_watched_at
  ON user_video_views(watched_at DESC);

-- ============================================================================
-- RATE_LIMITS TABLE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON rate_limits(window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON rate_limits(key, window_start);
