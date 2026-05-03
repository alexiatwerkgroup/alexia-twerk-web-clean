-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · NUKE OLD-PAGE FEATURES
-- 2026-05-02
--
-- The old page design had: heatmap, comments, likes, vote-hot, community
-- ranking. None of these are used by the current site anymore (the JS
-- files have been stubbed to no-op). This SQL drops the corresponding
-- tables + functions so they can no longer be hit by any client and stop
-- consuming disk + egress.
--
-- AFTER THIS RUNS, ONLY THESE TABLES REMAIN:
--   • profiles    (auth + tokens + admin stats)
--   • auth.users  (Supabase-managed, untouched)
--
-- AND ONLY THESE RPCs REMAIN:
--   • grant_tokens, claim_daily, claim_welcome, compute_tier
--   • bump_session, admin_get_full_stats
--   • username_available, email_for_username
--
-- IDEMPOTENT — `if exists` on every drop. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor → New Query → Run.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 0. Show sizes BEFORE the nuke (so you can see what was reclaimed) ───
select
  'BEFORE' as marker,
  (select count(*) from public.video_comments)    as video_comments,
  (select count(*) from public.comment_reports)   as comment_reports,
  (select count(*) from public.page_visits)       as page_visits,
  (select count(*) from public.video_heatmap)     as video_heatmap,
  (select count(*) from public.user_video_views)  as user_video_views;


-- ─── 1. Drop the RPC `record_watch` (writes to video_heatmap) ────────────
drop function if exists public.record_watch(text, int[]);
drop function if exists public.record_watch(text, integer[]);


-- ─── 2. Drop the 5 obsolete tables (CASCADE → drops indexes, FKs, views) ─
drop table if exists public.user_video_views  cascade;
drop table if exists public.video_heatmap     cascade;
drop table if exists public.page_visits       cascade;
drop table if exists public.comment_reports   cascade;
drop table if exists public.video_comments    cascade;


-- ─── 3. Reclaim the disk space ───────────────────────────────────────────
-- VACUUM cannot run inside a transaction block, so the SQL editor will
-- skip this in some setups. If it errors, just ignore — Postgres autovacuum
-- will reclaim the space within 24h.
-- (Commented out by default for safety. Uncomment if you want immediate reclaim.)
-- vacuum full;


-- ─── 4. Verify what's left in the public schema ──────────────────────────
select
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as size
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name)) desc;


-- ═══════════════════════════════════════════════════════════════════════════
-- Expected output of the last query:
--
--   table_name | size
--   -----------+--------
--   profiles   | <some KB>
--
-- That's it. One table. Egress should drop to essentially zero (only auth
-- + occasional profile reads + token RPCs remain).
-- ═══════════════════════════════════════════════════════════════════════════
