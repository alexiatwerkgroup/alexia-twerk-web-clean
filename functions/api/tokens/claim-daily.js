// POST /api/tokens/claim-daily   (auth required)
// Returns: { ok, granted, balance, streak, tier }
//
// Idempotent per UTC day. Replaces the Supabase claim_daily() RPC.
// Daily base = 50 tokens. Streak bonus = streak * 5 (capped at 50).

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';
import { computeTier } from '../../_lib/tier.js';

const DAILY_BASE = 50;
const STREAK_BONUS_PER_DAY = 5;
const STREAK_BONUS_CAP = 50;

function utcDate() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function yesterdayUtcDate() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const today = utcDate();
  const yesterday = yesterdayUtcDate();

  const profile = await env.DB.prepare(
    'SELECT tokens, total_earned, streak, last_login_date FROM profiles WHERE id = ?'
  )
    .bind(payload.sub)
    .first();

  if (!profile) return json({ ok: false, error: 'profile_not_found' }, 404, origin);

  if (profile.last_login_date === today) {
    return json(
      { ok: true, granted: 0, balance: profile.tokens, streak: profile.streak, tier: computeTier(profile.tokens), already_claimed: true },
      200,
      origin
    );
  }

  // Streak: continues if yesterday's login, resets to 1 otherwise.
  const newStreak = profile.last_login_date === yesterday ? (profile.streak || 0) + 1 : 1;
  const streakBonus = Math.min(newStreak * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
  const granted = DAILY_BASE + streakBonus;
  const newBalance = (profile.tokens || 0) + granted;
  const newTotal = (profile.total_earned || 0) + granted;
  const newTier = computeTier(newBalance);

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET tokens = ?, total_earned = ?, streak = ?, last_login_date = ?,
              tier = ?, last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(newBalance, newTotal, newStreak, today, newTier, payload.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json(
    { ok: true, granted, balance: newBalance, streak: newStreak, tier: newTier, already_claimed: false },
    200,
    origin
  );
}
