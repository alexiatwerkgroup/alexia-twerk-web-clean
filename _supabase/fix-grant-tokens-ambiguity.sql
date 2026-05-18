-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · FIX grant_tokens "column reference is ambiguous"
-- 2026-05-03
--
-- BUG: the original grant_tokens() declared `returns table (... tokens int ...)`
-- and inside the UPDATE used `set tokens = tokens + amount`. Postgres can't
-- decide whether `tokens` on the right-hand side refers to the column on
-- public.profiles or to the function's output column with the same name,
-- so it throws SQLSTATE 42702 "column reference is ambiguous" → HTTP 400.
--
-- IMPACT (live): every call from the client (token-system.js) was failing
-- silently inside a `try { ... } catch(_){}`, so users earned tokens
-- locally (in localStorage) but NOTHING was synced to Supabase.
-- The leaderboard shows total_earned = 200 for everyone — that 200 is the
-- welcome bonus from claim_welcome (which wasn't broken because it uses
-- `profiles.tokens` with the table prefix).
--
-- FIX: qualify every column reference inside the UPDATE with `profiles.`.
-- claim_daily and claim_welcome already do this correctly — we just align
-- grant_tokens to the same pattern.
--
-- HOW TO APPLY: open
--   https://supabase.com/dashboard/project/vieqniahusdrfkpcuqsn/sql/new
-- paste this whole file, click Run. Idempotent (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.grant_tokens(amount int, reason text default null)
returns table (id uuid, username text, tokens int, total_earned int, tier text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
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
    set tokens          = profiles.tokens       + amount,
        total_earned    = profiles.total_earned + amount,
        tier            = compute_tier(profiles.tokens + amount),
        last_active_at  = now()
    where profiles.id = uid
    returning profiles.id, profiles.username, profiles.tokens, profiles.total_earned, profiles.tier
    into id, username, tokens, total_earned, tier;

  return next;
end;
$$;

-- Sanity check: call it with a tiny amount and confirm it returns OK
-- (uncomment the next line to test as the currently-logged-in user)
-- select * from public.grant_tokens(1, 'fix-grant-tokens-test');
