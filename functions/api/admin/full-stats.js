// GET /api/admin/full-stats   (auth required, owner-only)
//   → { ok, users: [...], total_users, total_tokens_outstanding, ... }
//
// Replaces Supabase admin_get_full_stats RPC. Hard-gated to OWNER_EMAIL.
// Returns full user list (email + metrics) for the admin dashboard.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';
import { init } from '../../_lib/analytics.js';

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '';

  if (request.method === 'OPTIONS') return preflight(origin);
  if (request.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405, origin);
  if (!env.DB) return json({ ok: false, error: 'd1_binding_missing' }, 500, origin);

  const me = await authenticate(request, env);
  // Silent empty for non-owners (matches original Supabase RPC behavior).
  if (!me || !me.email || String(me.email).toLowerCase() !== OWNER_EMAIL) {
    return json({ ok: true, users: [], total_users: 0, owner_only: true }, 200, origin);
  }
  await init(env.DB);

  const usersRows = await env.DB.prepare(
    `SELECT id, email, username, tokens, total_earned, streak, tier,
            registered_at, last_login_date, last_seen_at,
            seconds_on_site, cuts_watched, welcomed
       FROM profiles
      ORDER BY registered_at DESC
      LIMIT 1000`
  ).all();

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) as total_users,
            COALESCE(SUM(tokens), 0) as total_tokens_outstanding,
            COALESCE(SUM(total_earned), 0) as total_tokens_lifetime,
            COALESCE(SUM(seconds_on_site), 0) as total_seconds,
            COALESCE(SUM(cuts_watched), 0) as total_cuts
       FROM profiles`
  ).first();

  const commentTotal = await env.DB.prepare(
    'SELECT COUNT(*) as n FROM video_comments'
  ).first();

  let visits=[],countries=[],payments=[],trackingSince=null;
  try {
    visits=((await env.DB.prepare("WITH ordered AS (SELECT uid,ts,LAG(ts) OVER (PARTITION BY uid ORDER BY ts) previous FROM tw_hits WHERE uid IS NOT NULL AND human=1) SELECT uid,COUNT(*) page_views,SUM(CASE WHEN previous IS NULL OR ts-previous>1800000 THEN 1 ELSE 0 END) visits FROM ordered GROUP BY uid").all()).results)||[];
    // Country comes from Cloudflare's request IP geolocation, so use the latest
    // observed location even when the visitor has not interacted with the page.
    countries=((await env.DB.prepare("SELECT uid,country,city FROM (SELECT uid,country,city,ROW_NUMBER() OVER (PARTITION BY uid ORDER BY last_active DESC,ts DESC) rank FROM tw_hits WHERE uid IS NOT NULL AND country<>'') WHERE rank=1").all()).results)||[];
    trackingSince=(await env.DB.prepare('SELECT MIN(ts) since FROM tw_hits').first())?.since||null;
  } catch {}
  try { payments=((await env.DB.prepare("SELECT LOWER(email) email,SUM(amount_usd) paid_usd FROM verified_payments WHERE status='confirmed' GROUP BY LOWER(email)").all()).results)||[]; } catch {}
  const visitMap=new Map(visits.map(x=>[x.uid,x])),countryMap=new Map(countries.map(x=>[x.uid,x])),paymentMap=new Map(payments.map(x=>[x.email,x.paid_usd]));
  const enriched=((usersRows&&usersRows.results)||[]).map(u=>({...u,country:countryMap.get(u.id)?.country||null,city:countryMap.get(u.id)?.city||null,recorded_visits:visitMap.get(u.id)?.visits??null,recorded_page_views:visitMap.get(u.id)?.page_views??null,confirmed_paid_usd:paymentMap.get(String(u.email).toLowerCase())??null}));
  return json(
    {
      ok: true,
      users: enriched,
      tracking_since: trackingSince,
      ...totals,
      total_comments: (commentTotal && commentTotal.n) || 0,
      generated_at: new Date().toISOString(),
    },
    200,
    origin
  );
}
