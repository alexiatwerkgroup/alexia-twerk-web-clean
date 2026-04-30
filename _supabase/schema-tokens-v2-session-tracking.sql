-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · Supabase schema · v2 · Session + cuts tracking + admin view
-- v20260430-p1
--
-- Adds the columns needed for the owner-only admin dashboard:
--   • seconds_on_site  → aggregated time spent (heartbeat-based)
--   • cuts_watched     → count of unique videos watched
--   • last_seen_at     → most recent heartbeat timestamp
--
-- Plus an atomic RPC `bump_session(seconds, cuts)` that the client calls
-- every 30s while the tab is visible, and an admin-gated RPC
-- `admin_get_full_stats()` that returns the complete user list (email
-- included) but ONLY if the caller is the platform owner.
--
-- Owner email is hardcoded in the RPC. Change it if needed.
--
-- IDEMPOTENT — safe to re-run.
-- Run this AFTER schema-tokens-v1.sql in Supabase Dashboard → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. New profile columns ──────────────────────────────────────────────
alter table public.profiles
  add column if not exists seconds_on_site bigint not null default 0,
  add column if not exists cuts_watched     int    not null default 0,
  add column if not exists last_seen_at     timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles (last_seen_at desc nulls last);

-- ─── 2. RPC: bump_session(seconds, cuts) ─────────────────────────────────
-- Called by the client heartbeat. Atomic +seconds, +cuts. Validation:
--   · seconds in [0, 60]   (heartbeat is every 30s; cap at 60 for safety)
--   · cuts    in [0, 5]    (one click bumps 1; cap at 5 to absorb bursts)
-- Returns the updated counters.
create or replace function public.bump_session(seconds_delta int, cuts_delta int default 0)
returns table (seconds_on_site bigint, cuts_watched int, last_seen_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Not authenticated'; end if;
  if seconds_delta < 0 or seconds_delta > 60 then raise exception 'seconds_delta out of range'; end if;
  if cuts_delta < 0 or cuts_delta > 5     then raise exception 'cuts_delta out of range';     end if;

  update public.profiles
    set seconds_on_site = profiles.seconds_on_site + seconds_delta,
        cuts_watched    = profiles.cuts_watched    + cuts_delta,
        last_seen_at    = now(),
        last_active_at  = now()
    where profiles.id = uid
    returning profiles.seconds_on_site, profiles.cuts_watched, profiles.last_seen_at
    into seconds_on_site, cuts_watched, last_seen_at;

  return next;
end;
$$;

grant execute on function public.bump_session(int, int) to authenticated;

-- ─── 3. RPC: admin_get_full_stats() ──────────────────────────────────────
-- Returns the FULL user list with email and all metrics — but ONLY if the
-- caller's auth email matches the owner email. Anyone else gets an empty
-- result (no rows), no error, no leak.
create or replace function public.admin_get_full_stats()
returns table (
  id uuid,
  username text,
  email text,
  tokens int,
  total_earned int,
  streak int,
  tier text,
  seconds_on_site bigint,
  cuts_watched int,
  registered_at timestamptz,
  last_seen_at timestamptz,
  last_active_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text;
  owner_email  text := 'alexiatwerkoficial@gmail.com';
begin
  select au.email into caller_email
    from auth.users au
    where au.id = auth.uid();

  if caller_email is null or lower(caller_email) <> lower(owner_email) then
    -- silently return nothing for non-owners
    return;
  end if;

  return query
    select
      p.id,
      p.username,
      p.email,
      p.tokens,
      p.total_earned,
      p.streak,
      p.tier,
      p.seconds_on_site,
      p.cuts_watched,
      p.registered_at,
      p.last_seen_at,
      p.last_active_at
    from public.profiles p
    order by p.last_seen_at desc nulls last, p.tokens desc
    limit 5000;
end;
$$;

grant execute on function public.admin_get_full_stats() to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verify after running:
--   select column_name, data_type from information_schema.columns
--    where table_name='profiles' and column_name in
--          ('seconds_on_site','cuts_watched','last_seen_at');
--   select * from admin_get_full_stats() limit 5;   -- run while logged in as owner
-- ═══════════════════════════════════════════════════════════════════════════
