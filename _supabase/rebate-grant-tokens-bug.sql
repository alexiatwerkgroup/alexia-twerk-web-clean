-- ═══════════════════════════════════════════════════════════════════════════
-- TWERKHUB · REBATE — grant_tokens bug compensation
-- 2026-05-03
--
-- ONE-TIME +300 token grant to every user affected by the grant_tokens
-- ambiguity bug (Apr 25 → May 3). Users registered during that window
-- earned tokens locally but nothing synced to Supabase, so total_earned
-- on the server is still 200 (welcome bonus) for everyone.
--
-- Eligibility:
--   • total_earned <= 200 (i.e. nothing besides welcome got through)
--   • registered_at >= 2026-04-25 (the day token-system went live)
--   • NOT the admin account (Firestarter has manually-set 999,999)
--
-- This is a NET ADD, not a reset. Safe even if some user happens to have
-- exactly 200 from welcome alone (they get bumped to 500).
--
-- Idempotent? NO — running this twice will give +600. Run ONCE.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. PREVIEW: see who's about to be bumped
select count(*) as users_to_rebate,
       sum(case when total_earned = 200 then 1 else 0 end) as exactly_200,
       sum(case when total_earned = 0 then 1 else 0 end) as never_got_welcome
from public.profiles
where total_earned <= 200
  and registered_at >= '2026-04-25'
  and id != 'e24b0e1c-b965-4e3a-b66e-de1aefb4849f';

-- 2. APPLY THE REBATE
update public.profiles
set tokens          = tokens + 300,
    total_earned    = total_earned + 300,
    tier            = public.compute_tier(tokens + 300),
    last_active_at  = coalesce(last_active_at, now())
where total_earned <= 200
  and registered_at >= '2026-04-25'
  and id != 'e24b0e1c-b965-4e3a-b66e-de1aefb4849f';

-- 3. VERIFY: confirm the new totals
select username, email, total_earned, tier
from public.profiles
where registered_at >= '2026-04-25'
  and id != 'e24b0e1c-b965-4e3a-b66e-de1aefb4849f'
order by total_earned desc, registered_at asc;
