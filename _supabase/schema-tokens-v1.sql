-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · Supabase schema · Token system + leaderboard
-- v20260425-p1
--
-- Run this SQL in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- What it does:
-- 1. Adds tokens/streak/tier columns to the existing `profiles` table
-- 2. Creates auto-trigger so a profile row is created when a user signs up
-- 3. Creates a public leaderboard view (anyone can read username + tokens)
-- 4. RLS policies: users can read all public profile fields, only edit their own
-- 5. Helper RPC functions: grant_tokens, get_leaderboard, claim_daily
--
-- Idempotent: safe to run multiple times. Uses IF NOT EXISTS / CREATE OR REPLACE.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. ALTER profiles to add token-related columns ──────────────────────
alter table public.profiles
  add column if not exists tokens          int     not null default 0,
  add column if not exists total_earned    int     not null default 0,
  add column if not exists streak          int     not null default 0,
  add column if not exists last_login_date date,
  add column if not exists welcomed        boolean not null default false,
  add column if not exists tier            text    not null default 'basic',
  add column if not exists last_active_at  timestamptz,
  add column if not exists registered_at   timestamptz default now();

-- Backfill registered_at for existing rows that don't have it set.
update public.profiles
  set registered_at = coalesce(registered_at, created_at, now())
  where registered_at is null;

-- Indexes for leaderboard queries.
create index if not exists profiles_tokens_idx on public.profiles (tokens desc);
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- ─── 2. Auto-create profile row on signup ────────────────────────────────
-- When a user signs up via auth.signUp(), we get an entry in auth.users.
-- This trigger creates a matching profiles row with the username from metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, registered_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── 3. Tier computation function ────────────────────────────────────────
create or replace function public.compute_tier(token_count int)
returns text
language sql
immutable
as $$
  select case
    when token_count >= 10000 then 'vip'
    when token_count >=  2000 then 'premium'
    when token_count >=   500 then 'medium'
    else 'basic'
  end;
$$;

-- ─── 4. RPC: grant_tokens(amount) — atomic increment for current user ────
-- The client calls this instead of direct UPDATE so we control validation.
-- Returns the updated profile row.
create or replace function public.grant_tokens(amount int, reason text default null)
returns table (id uuid, username text, tokens int, total_earned int, tier text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  new_tokens int;
  new_total int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if amount > 1000 then
    raise exception 'Amount too large for single grant';
  end if;

  update public.profiles
    set tokens = tokens + amount,
        total_earned = total_earned + amount,
        tier = compute_tier(tokens + amount),
        last_active_at = now()
    where profiles.id = uid
    returning profiles.id, profiles.username, profiles.tokens, profiles.total_earned, profiles.tier
    into id, username, tokens, total_earned, tier;

  return next;
end;
$$;

-- ─── 5. RPC: claim_daily — daily login bonus + streak ─────────────────────
create or replace function public.claim_daily()
returns table (granted int, streak int, tokens int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  last date;
  yesterday date;
  today date;
  cur_streak int;
  bonus int;
  total_grant int;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Not authenticated'; end if;

  today := current_date;
  yesterday := today - 1;

  select last_login_date, profiles.streak into last, cur_streak
    from public.profiles where profiles.id = uid;

  if last = today then
    -- already claimed today
    select profiles.tokens into tokens from public.profiles where profiles.id = uid;
    granted := 0;
    streak := cur_streak;
    return next;
    return;
  end if;

  if last = yesterday then
    cur_streak := cur_streak + 1;
  else
    cur_streak := 1;
  end if;

  bonus := least(cur_streak, 7) * 25;
  total_grant := 50 + bonus;

  update public.profiles
    set tokens = profiles.tokens + total_grant,
        total_earned = profiles.total_earned + total_grant,
        streak = cur_streak,
        last_login_date = today,
        tier = compute_tier(profiles.tokens + total_grant),
        last_active_at = now()
    where profiles.id = uid
    returning profiles.tokens into tokens;

  granted := total_grant;
  streak := cur_streak;
  return next;
end;
$$;

-- ─── 6. RPC: claim_welcome — one-time welcome bonus on first signup ──────
create or replace function public.claim_welcome()
returns table (granted int, tokens int)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  already boolean;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Not authenticated'; end if;

  select welcomed into already from public.profiles where profiles.id = uid;
  if already then
    select profiles.tokens into tokens from public.profiles where profiles.id = uid;
    granted := 0;
    return next;
    return;
  end if;

  update public.profiles
    set tokens = profiles.tokens + 200,
        total_earned = profiles.total_earned + 200,
        welcomed = true,
        tier = compute_tier(profiles.tokens + 200),
        last_active_at = now()
    where profiles.id = uid
    returning profiles.tokens into tokens;

  granted := 200;
  return next;
end;
$$;

-- ─── 7. Public leaderboard view ──────────────────────────────────────────
-- Exposes ONLY safe fields (no email) so it can be queried by anonymous users.
create or replace view public.leaderboard as
  select
    id,
    username,
    tokens,
    total_earned,
    streak,
    tier,
    registered_at
  from public.profiles
  where tokens > 0
  order by tokens desc;

grant select on public.leaderboard to anon, authenticated;

-- ─── 8. Row-Level Security policies ──────────────────────────────────────
alter table public.profiles enable row level security;

-- Anyone can read username+tokens+tier (for leaderboard, profile pages).
-- Email is intentionally INCLUDED only when reading own row.
drop policy if exists "Public profiles readable by anyone" on public.profiles;
create policy "Public profiles readable by anyone"
  on public.profiles for select
  using (true);

-- Users can only update their own row, and ONLY non-token fields.
-- Token mutations must go through grant_tokens / claim_* RPCs.
drop policy if exists "Users update own non-token fields" on public.profiles;
create policy "Users update own non-token fields"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No INSERT policy — profiles are created by the trigger only.
-- No DELETE policy — profiles aren't deletable by clients.

-- ─── 9. Username uniqueness check (helper for signup form) ───────────────
create or replace function public.username_available(check_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(check_username)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.grant_tokens(int, text) to authenticated;
grant execute on function public.claim_daily() to authenticated;
grant execute on function public.claim_welcome() to authenticated;

-- ─── 10. Lookup helper: find email by username (for username-login) ──────
-- Used when user types a username instead of email at login. We look up the
-- email from profiles and then call auth.signInWithPassword(email, password).
-- Returns the email if username exists, else null.
create or replace function public.email_for_username(check_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles where lower(username) = lower(check_username) limit 1;
$$;

grant execute on function public.email_for_username(text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Done. Verify the migration with:
--
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema = 'public' and table_name = 'profiles'
--    order by ordinal_position;
--
--   select * from public.leaderboard limit 10;
-- ═══════════════════════════════════════════════════════════════════════════
