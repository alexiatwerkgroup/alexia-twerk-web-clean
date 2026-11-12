// GET /api/admin/full-stats   (auth required, owner-only)
//   → { ok, users: [...], total_users, total_tokens_outstanding, ... }
//
// Replaces Supabase admin_get_full_stats RPC. Hard-gated to OWNER_EMAIL.
// Returns full user list (email + metrics) for the admin dashboard.

import { authenticate } from '../../_lib/auth.js';
import { json, preflight } from '../../_lib/http.js';
import { init } from '../../_lib/analytics.js';

const OWNER_EMAIL = 'alexiatwerkoficial@gmail.com';

// Every account must show entries + last entry: take the best evidence available.
// Hits (tw_hits by uid) > profile columns > the registration itself (registering is an entry).
const parseWhen = v => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000;
  const s = String(v).trim();
  const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00Z' : /Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s.replace(' ', 'T') + 'Z');
  return Number.isFinite(t) ? t : 0;
};
const entryInfo = (u, visit) => {
  const hits = Number(visit?.visits) || 0;
  const last = Math.max(parseWhen(u.last_login_date), parseWhen(u.last_seen_at), Number(visit?.last_hit) || 0, parseWhen(u.registered_at));
  return { recorded_visits: Math.max(hits, 1), recorded_visits_basis: hits ? 'hits' : 'registro', last_entry_at: last || null };
};

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

  // Lightweight polling path for the live stats screen. Keep the existing
  // full owner report intact; the dashboard only needs the 25 newest accounts.
  if (new URL(request.url).searchParams.get('latest') === '1') {
    const usersRows = await env.DB.prepare(
      `SELECT id, email, username, tokens, total_earned, streak, tier,
              registered_at, last_login_date, last_seen_at,
              seconds_on_site, cuts_watched, welcomed
         FROM profiles
        ORDER BY registered_at DESC
        LIMIT 25`
    ).all();
    const users = (usersRows.results || []);
    const ids = users.map(u => u.id).filter(Boolean);
    let visits = [], countries = [], payments = [];
    if (ids.length) {
      const marks = ids.map(() => '?').join(',');
      visits = (await env.DB.prepare(
        `SELECT uid, COUNT(*) page_views,
                SUM(CASE WHEN previous IS NULL OR ts-previous>1800000 THEN 1 ELSE 0 END) visits, MAX(ts) last_hit
           FROM (SELECT uid,ts,LAG(ts) OVER (PARTITION BY uid ORDER BY ts) previous
                   FROM tw_hits WHERE uid IN (${marks}) AND human=1)
          GROUP BY uid`
      ).bind(...ids).all()).results || [];
      countries = (await env.DB.prepare(
        `SELECT uid,country,city FROM (
           SELECT uid,country,city,ROW_NUMBER() OVER (PARTITION BY uid ORDER BY COALESCE(last_active,ts) DESC) rank
             FROM tw_hits WHERE uid IN (${marks}) AND country<>'')
          WHERE rank=1`
      ).bind(...ids).all()).results || [];
      const emails = users.map(u => String(u.email || '').toLowerCase()).filter(Boolean);
      if (emails.length) {
        const emailMarks = emails.map(() => '?').join(',');
        try {
          payments = (await env.DB.prepare(
            `SELECT LOWER(email) email,SUM(amount_usd) paid_usd FROM verified_payments
              WHERE status='confirmed' AND LOWER(email) IN (${emailMarks}) GROUP BY LOWER(email)`
          ).bind(...emails).all()).results || [];
        } catch (_) {}
      }
    }
    const visitMap = new Map(visits.map(x => [x.uid, x]));
    const countryMap = new Map(countries.map(x => [x.uid, x]));
    const paymentMap = new Map(payments.map(x => [x.email, x.paid_usd]));
    const enriched = users.map(u => ({
      ...u,
      country: countryMap.get(u.id)?.country || null,
      city: countryMap.get(u.id)?.city || null,
      ...entryInfo(u, visitMap.get(u.id)),
      recorded_page_views: visitMap.get(u.id)?.page_views ?? null,
      confirmed_paid_usd: paymentMap.get(String(u.email || '').toLowerCase()) ?? null,
    }));
    const total = await env.DB.prepare('SELECT COUNT(*) total_users FROM profiles').first();
    return json({ ok: true, users: enriched, total_users: total?.total_users || 0, generated_at: new Date().toISOString() }, 200, origin);
  }

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
    visits=((await env.DB.prepare("WITH ordered AS (SELECT uid,ts,LAG(ts) OVER (PARTITION BY uid ORDER BY ts) previous FROM tw_hits WHERE uid IS NOT NULL AND human=1) SELECT uid,COUNT(*) page_views,SUM(CASE WHEN previous IS NULL OR ts-previous>1800000 THEN 1 ELSE 0 END) visits, MAX(ts) last_hit FROM ordered GROUP BY uid").all()).results)||[];
    // Country comes from Cloudflare's request IP geolocation, so use the latest
    // observed location even when the visitor has not interacted with the page.
    countries=((await env.DB.prepare("SELECT uid,country,city FROM (SELECT uid,country,city,ROW_NUMBER() OVER (PARTITION BY uid ORDER BY last_active DESC,ts DESC) rank FROM tw_hits WHERE uid IS NOT NULL AND country<>'') WHERE rank=1").all()).results)||[];
    trackingSince=(await env.DB.prepare('SELECT MIN(ts) since FROM tw_hits').first())?.since||null;
  } catch {}
  try { payments=((await env.DB.prepare("SELECT LOWER(email) email,SUM(amount_usd) paid_usd FROM verified_payments WHERE status='confirmed' GROUP BY LOWER(email)").all()).results)||[]; } catch {}
  const visitMap=new Map(visits.map(x=>[x.uid,x])),countryMap=new Map(countries.map(x=>[x.uid,x])),paymentMap=new Map(payments.map(x=>[x.email,x.paid_usd]));
  const enriched=((usersRows&&usersRows.results)||[]).map(u=>({...u,country:countryMap.get(u.id)?.country||null,city:countryMap.get(u.id)?.city||null,...entryInfo(u,visitMap.get(u.id)),recorded_page_views:visitMap.get(u.id)?.page_views??null,confirmed_paid_usd:paymentMap.get(String(u.email).toLowerCase())??null}));
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
