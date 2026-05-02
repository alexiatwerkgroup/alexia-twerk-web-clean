-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · EMERGENCY EGRESS CLEANUP
-- 2026-05-02
--
-- Context: Supabase free tier hit 232% bandwidth quota (12.79GB / 5.5GB).
-- Grace period reduced from May 26 → May 5 (3 days). After May 5 the project
-- starts returning HTTP 402 and breaks.
--
-- Root cause: page_visits table was being SELECTed by every visitor + every
-- bot every few minutes, returning 100s of rows each time. Yandex bot
-- crawl (added today) made it explode.
--
-- This SQL:
--   1. Truncates old page_visits rows (anything older than 24h is useless
--      for "online count" — that window only needs the last 60 minutes).
--   2. Adds a partial index so any future read is cheap.
--   3. Reports current row count for visibility.
--
-- Run in Supabase Dashboard → SQL Editor → New Query → Run.
-- IDEMPOTENT — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Show current size BEFORE cleanup ─────────────────────────────────
select
  count(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('public.page_visits')) as table_size,
  min(created_at) as oldest_row,
  max(created_at) as newest_row
from public.page_visits;

-- ─── 2. Delete rows older than 24h ───────────────────────────────────────
-- We only ever query the last 60 min for online count. Anything past 24h
-- is dead weight. Adjust the interval if you want to keep audit history.
delete from public.page_visits
  where created_at < now() - interval '24 hours';

-- ─── 3. Reclaim disk space (VACUUM FULL is locking, but ANALYZE is fine) ─
analyze public.page_visits;

-- ─── 4. Add a partial index for fast online-count queries ────────────────
-- Even though our client no longer reads this table directly, the admin
-- dashboard might. This index makes those reads cheap when they happen.
create index if not exists page_visits_online_recent_idx
  on public.page_visits (created_at desc, visitor_id)
  where page = 'online';

-- ─── 5. Show size AFTER cleanup ──────────────────────────────────────────
select
  count(*) as total_rows_after,
  pg_size_pretty(pg_total_relation_size('public.page_visits')) as table_size_after,
  min(created_at) as oldest_row_after,
  max(created_at) as newest_row_after
from public.page_visits;

-- ═══════════════════════════════════════════════════════════════════════════
-- Optional follow-up: schedule a daily cron job in Supabase to auto-truncate.
-- Go to Database → Cron Jobs → New Job:
--   name:     truncate-old-page-visits
--   schedule: 0 4 * * *   (4am UTC daily)
--   command:  delete from public.page_visits where created_at < now() - interval '24 hours';
-- ═══════════════════════════════════════════════════════════════════════════
