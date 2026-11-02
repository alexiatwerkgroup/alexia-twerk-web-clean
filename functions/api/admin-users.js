// TWERKHUB · registered users endpoint (owner only) · Cloudflare Pages Function + D1
// Reads the real registered users from D1 table `profiles` (same table the login uses),
// plus coins and unlocked videos per user. Binding: D1 "DB" -> twerkhub-subscribers.

import { authenticate } from '../_lib/auth.js';
const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';
const ALLOWED_ORIGINS = [
  'https://alexiatwerkgroup.com',
  'https://www.alexiatwerkgroup.com',
];


function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'GET') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  }

  // D1 binding check
  if (!env.DB) {
    return json({ ok: false, error: 'd1_binding_missing', data: [] }, 500, origin);
  }

  // OWNER ONLY: this endpoint lists every registered email, so it must never be public.
  const au = await authenticate(request, env).catch(() => null);
  const ou = au && au.sub ? await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(au.sub).first() : null;
  if (!ou || String(ou.email).toLowerCase() !== OWNER_EMAIL) return json({ ok: false, error: 'owner_only' }, 403, origin);

  try {
    // Registered users live in D1 (profiles) -- the same table the login system uses.
    const profiles = ((await env.DB.prepare('SELECT * FROM profiles ORDER BY registered_at DESC LIMIT 5000').all()).results) || [];
    console.log(`[admin-users] Fetched ${profiles.length} profiles from D1`);

    // Transform profiles into user rows
    const users = (profiles || []).map((profile, idx) => ({
      rank: idx + 1,
      id: profile.id,
      username: profile.username || profile.email?.split('@')[0] || `user_${idx}`,
      email: profile.email || '',
      tokens: profile.tokens || 0,
      total_earned: profile.total_earned || 0,
      seconds_on_site: profile.seconds_on_site || 0,
      cuts_watched: profile.cuts_watched || 0,
      streak: profile.streak || 0,
      tier: profile.tier || 'basic',
      registered_at: profile.registered_at || profile.created_at || null,
      last_seen_at: profile.last_seen_at || profile.last_active_at || null,
      source: 'd1',
      confirmed: 1
    }));

    // coins + unlocks per user (D1)
    try {
      const cs = (await env.DB.prepare('SELECT email, coins FROM jenny_coins').all()).results || [];
      const us = (await env.DB.prepare('SELECT email, COUNT(*) n FROM jenny_unlocks GROUP BY email').all()).results || [];
      const ul = (await env.DB.prepare('SELECT email, n, via FROM jenny_unlocks ORDER BY rowid').all()).results || []; const lm = {}; ul.forEach(r => { const k = String(r.email).toLowerCase(); (lm[k] = lm[k] || []).push({ n: r.n, via: r.via }); });
      const cm = {}, um = {}; cs.forEach(r => { cm[String(r.email).toLowerCase()] = r.coins; }); us.forEach(r => { um[String(r.email).toLowerCase()] = r.n; });
      users.forEach(u => { const k = String(u.email || '').toLowerCase(); u.coins = cm[k] || 0; u.unlocks = um[k] || 0; u.unlock_list = lm[k] || []; });
    } catch (e) {}

    // Get stats from D1 subscribers table
    let statsResult = null;
    try { statsResult = await env.DB.prepare('SELECT COUNT(*) as total_users FROM subscribers').first(); } catch (e) {}

    const stats = {
      total_users: users.length,
      confirmed_users: users.length,
      unsubscribed_users: 0,
      active_users: users.length,
      d1_profiles: users.length,
      d1_subscribers: statsResult?.total_users || 0
    };

    console.log(`[admin-users] Returning ${users.length} users with stats`, stats);

    return json(
      {
        ok: true,
        data: users,
        stats: stats,
        total_count: users.length
      },
      200,
      origin
    );
  } catch (err) {
    console.error('[admin-users] D1 query failed', err && err.message);
    return json(
      {
        ok: false,
        error: 'query_failed',
        message: err?.message || 'unknown_error',
        data: []
      },
      500,
      origin
    );
  }
}
