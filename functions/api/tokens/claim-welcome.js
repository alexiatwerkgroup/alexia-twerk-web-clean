// POST /api/tokens/claim-welcome   (auth required)
// One-time +200 welcome bonus on first login.
// Returns: { ok, granted, balance, tier, already_welcomed }

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';
import { computeTier } from '../../_lib/tier.js';

const WELCOME_BONUS = 200;

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const profile = await env.DB.prepare(
    'SELECT tokens, total_earned, welcomed FROM profiles WHERE id = ?'
  )
    .bind(payload.sub)
    .first();

  if (!profile) return json({ ok: false, error: 'profile_not_found' }, 404, origin);

  if (profile.welcomed) {
    return json(
      { ok: true, granted: 0, balance: profile.tokens, tier: computeTier(profile.tokens), already_welcomed: true },
      200,
      origin
    );
  }

  const newBalance = (profile.tokens || 0) + WELCOME_BONUS;
  const newTotal = (profile.total_earned || 0) + WELCOME_BONUS;
  const newTier = computeTier(newBalance);

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET tokens = ?, total_earned = ?, welcomed = 1, tier = ?,
              last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(newBalance, newTotal, newTier, payload.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json(
    { ok: true, granted: WELCOME_BONUS, balance: newBalance, tier: newTier, already_welcomed: false },
    200,
    origin
  );
}
