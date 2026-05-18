// POST /api/tokens/grant   (auth required)
// Body: { amount: 1..1000, reason: string }
// Returns: { ok, granted, balance, tier }
//
// Replaces Supabase grant_tokens RPC. Amount clamped to 1..1000 server-side
// for safety (clients can't grant arbitrary amounts).

import { authenticate } from '../../_lib/auth.js';
import { json, preflight, readJSON } from '../../_lib/http.js';
import { computeTier } from '../../_lib/tier.js';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const payload = await authenticate(request, env);
  if (!payload || !payload.sub) return json({ ok: false, error: 'unauthorized' }, 401, origin);

  const body = await readJSON(request);
  if (!body) return json({ ok: false, error: 'bad_json' }, 400, origin);

  let amount = parseInt(body.amount, 10);
  if (isNaN(amount)) return json({ ok: false, error: 'invalid_amount' }, 400, origin);
  amount = Math.max(1, Math.min(1000, amount));
  const reason = String(body.reason || '').slice(0, 64);

  const profile = await env.DB.prepare(
    'SELECT tokens, total_earned FROM profiles WHERE id = ?'
  )
    .bind(payload.sub)
    .first();

  if (!profile) return json({ ok: false, error: 'profile_not_found' }, 404, origin);

  const newBalance = (profile.tokens || 0) + amount;
  const newTotal = (profile.total_earned || 0) + amount;
  const newTier = computeTier(newBalance);

  try {
    await env.DB.prepare(
      `UPDATE profiles
          SET tokens = ?, total_earned = ?, tier = ?,
              last_active_at = CURRENT_TIMESTAMP
        WHERE id = ?`
    )
      .bind(newBalance, newTotal, newTier, payload.sub)
      .run();
  } catch (e) {
    return json({ ok: false, error: 'storage_failed', detail: e && e.message }, 500, origin);
  }

  return json({ ok: true, granted: amount, balance: newBalance, tier: newTier, reason }, 200, origin);
}
