// GET /api/jenny/activity -> real, anonymous unlock activity (no emails) for the FOMO alerts + progress bar.
// Only genuine paid/token unlocks count; the owner's own tests are excluded.
import { OWNER, isExplicit } from '../../_lib/jenny.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return new Response('{"ok":false}', { status: 405 });
  const own = OWNER.toLowerCase();
  const base = "FROM jenny_unlocks WHERE via IN ('coins','tokens') AND lower(email) <> ?";
  const recent = await env.DB.prepare(
    `SELECT n, CAST((strftime('%s','now') - strftime('%s', at)) / 60 AS INTEGER) AS ago ${base} AND at >= datetime('now','-24 hours') ORDER BY at DESC LIMIT 12`
  ).bind(own).all();
  const per = await env.DB.prepare(`SELECT n, COUNT(*) c ${base} GROUP BY n`).bind(own).all();
  const perVideo = {}; let explicitSeen = 0;
  for (const r of (per.results || [])) { perVideo[r.n] = r.c; if (isExplicit(r.n)) explicitSeen++; }
  const last = (recent.results || []).filter(r => r.ago >= 0);
  const hour = last.filter(r => r.ago < 60).length;
  return new Response(JSON.stringify({ ok: true, explicitSeen, perVideo, last, hour }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=30' },
  });
}
