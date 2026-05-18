-- Run this once in Supabase SQL Editor.
-- Stable tracking schema for analytics-profile.js / assets/profile-page.js

create extension if not exists pgcrypto;

create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  username text,
  total_time_seconds integer not null default 0,
  video_watch_seconds integer not null default 0,
  total_videos_watched integer not null default 0,
  videos_viewed_count integer not null default 0,
  score integer not null default 0,
  last_update timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_stats add column if not exists username text;
alter table public.user_stats add column if not exists total_time_seconds integer not null default 0;
alter table public.user_stats add column if not exists video_watch_seconds integer not null default 0;
alter table public.user_stats add column if not exists total_videos_watched integer not null default 0;
alter table public.user_stats add column if not exists videos_viewed_count integer not null default 0;
alter table public.user_stats add column if not exists score integer not null default 0;
alter table public.user_stats add column if not exists last_update timestamptz not null default now();
alter table public.user_stats add column if not exists updated_at timestamptz not null default now();

update public.user_stats
set videos_viewed_count = coalesce(videos_viewed_count, total_videos_watched, 0),
    updated_at = coalesce(updated_at, last_update, now());

create unique index if not exists uq_user_stats_user_id on public.user_stats(user_id);

create table if not exists public.user_video_views (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  video_slug text not null,
  video_id text,
  page_url text,
  watched_seconds integer not null default 0,
  viewed boolean not null default false,
  last_seen_at timestamptz not null default now(),
  watched_at timestamptz not null default now()
);

alter table public.user_video_views add column if not exists video_slug text;
alter table public.user_video_views add column if not exists video_id text;
alter table public.user_video_views add column if not exists page_url text;
alter table public.user_video_views add column if not exists watched_seconds integer not null default 0;
alter table public.user_video_views add column if not exists viewed boolean not null default false;
alter table public.user_video_views add column if not exists last_seen_at timestamptz not null default now();
alter table public.user_video_views add column if not exists watched_at timestamptz not null default now();

update public.user_video_views
set video_slug = coalesce(nullif(video_slug, ''), nullif(video_id, ''), 'unknown'),
    watched_seconds = greatest(coalesce(watched_seconds, 0), 0),
    viewed = coalesce(viewed, false),
    last_seen_at = coalesce(last_seen_at, watched_at, now());

create index if not exists idx_user_video_views_user_id on public.user_video_views(user_id);
create index if not exists idx_user_video_views_video_slug on public.user_video_views(video_slug);
create unique index if not exists uq_user_video_views_user_slug on public.user_video_views(user_id, video_slug);

alter table public.user_stats enable row level security;
alter table public.user_video_views enable row level security;

drop policy if exists "Public select user_stats" on public.user_stats;
drop policy if exists "Public insert user_stats" on public.user_stats;
drop policy if exists "Public update user_stats" on public.user_stats;
drop policy if exists "Public select user_video_views" on public.user_video_views;
drop policy if exists "Public insert user_video_views" on public.user_video_views;
drop policy if exists "Public update user_video_views" on public.user_video_views;

create policy "Public select user_stats"
on public.user_stats for select
to anon, authenticated
using (true);

create policy "Public insert user_stats"
on public.user_stats for insert
to anon, authenticated
with check (true);

create policy "Public update user_stats"
on public.user_stats for update
to anon, authenticated
using (true)
with check (true);

create policy "Public select user_video_views"
on public.user_video_views for select
to anon, authenticated
using (true);

create policy "Public insert user_video_views"
on public.user_video_views for insert
to anon, authenticated
with check (true);

create policy "Public update user_video_views"
on public.user_video_views for update
to anon, authenticated
using (true)
with check (true);
