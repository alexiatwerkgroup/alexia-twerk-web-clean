-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · Supabase data export
-- 2026-05-02
--
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run.
-- For each query block: click "Download CSV" on the result panel and save
-- the file under _supabase/exports/<table>.csv. That folder will become
-- the seed data for the new provider.
--
-- Order matters because of FK dependencies. Run blocks in order, exporting
-- each before moving on.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. auth.users (the most important — contains password hashes) ───────
-- Note: this view is restricted; if it returns empty, use Supabase Dashboard
-- → Authentication → Users → "Export users" instead. Keep the resulting
-- JSON or CSV — those bcrypt hashes are needed if you want to keep
-- email+password login on the new provider.
select
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  raw_user_meta_data,
  encrypted_password    -- only available to the Postgres role, NOT via API
from auth.users
order by created_at;


-- ─── 2. profiles (the application user table) ────────────────────────────
select
  id,
  email,
  username,
  bio,
  avatar_url,
  created_at,
  registered_at,
  tokens,
  total_earned,
  streak,
  last_login_date,
  welcomed,
  tier,
  last_active_at,
  seconds_on_site,
  cuts_watched,
  last_seen_at
from public.profiles
order by registered_at;


-- ─── 3. video_comments ───────────────────────────────────────────────────
select *
from public.video_comments
order by created_at;


-- ─── 4. comment_reports ──────────────────────────────────────────────────
select *
from public.comment_reports
order by created_at;


-- ─── 5. video_heatmap ────────────────────────────────────────────────────
select *
from public.video_heatmap
order by video_id;


-- ─── 6. user_video_views ─────────────────────────────────────────────────
-- Big table. Optional — if you don't care about historical view counts on
-- the new backend, skip this and start fresh.
select *
from public.user_video_views
order by created_at;


-- ─── 7. page_visits — DO NOT EXPORT ──────────────────────────────────────
-- This is the egress culprit. Past data is worthless on the new provider.
-- Just create an empty `page_visits` table on the destination (or skip
-- entirely if you replace presence-tracking with a Cloudflare Worker
-- Durable Object).


-- ─── 8. List of all RPC functions in the public schema ───────────────────
-- Run this and paste the output into _supabase/RPC-FUNCTIONS-DUMP.sql
-- so we capture any function that was created live in the dashboard
-- and never made it into a committed .sql file.
select
  p.proname             as function_name,
  pg_get_functiondef(p.oid) as full_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;


-- ─── 9. List of all RLS policies in the public schema ────────────────────
-- Same idea — capture anything not in v1/v2 SQL files.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ─── 10. List of all tables + columns in the public schema ───────────────
-- Sanity check — if there's a table here that's NOT documented in
-- MIGRATION-MANIFEST.md §2, it needs to be added before cutover.
select
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- ─── 11. Row counts (for sizing the destination database) ────────────────
select 'profiles'         as table_name, count(*) from public.profiles
union all
select 'video_comments',     count(*) from public.video_comments
union all
select 'comment_reports',    count(*) from public.comment_reports
union all
select 'video_heatmap',      count(*) from public.video_heatmap
union all
select 'user_video_views',   count(*) from public.user_video_views
union all
select 'page_visits',        count(*) from public.page_visits
union all
select 'auth.users',         count(*) from auth.users;


-- ═══════════════════════════════════════════════════════════════════════════
-- After this, you should have:
--   _supabase/exports/profiles.csv
--   _supabase/exports/video_comments.csv
--   _supabase/exports/comment_reports.csv
--   _supabase/exports/video_heatmap.csv
--   _supabase/exports/user_video_views.csv          (optional)
--   _supabase/exports/auth-users.json               (from the dashboard UI)
--   _supabase/RPC-FUNCTIONS-DUMP.sql                (paste from query 8)
--   _supabase/RLS-POLICIES-DUMP.sql                 (paste from query 9)
--   _supabase/SCHEMA-INSPECTION.csv                 (paste from query 10)
--
-- That set is everything needed to rebuild the backend from scratch on
-- Neon, Cloudflare D1, Turso, or a fresh Supabase project. Commit it.
-- ═══════════════════════════════════════════════════════════════════════════
