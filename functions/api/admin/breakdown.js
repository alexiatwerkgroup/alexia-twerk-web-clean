// Owner-only extras for the stats dashboard: "hoy · total" per row, rabbit prizes, per-visit time.
// Kept separate from traffic-stats so a failure here can never break the main panel.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const cache = new Map();
const REFX = "CASE WHEN ref='' THEN 'Directo / sin dato' ELSE ref END";
const map = (rs) => { const o = {}; (rs || []).forEach(r => { o[String(r.k)] = r.n; }); return o; };

export async function onRequestGet({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const bots = url.searchParams.get('bots') === '1', hf = bots ? '' : ' AND human = 1', evF = bots ? '' : ' AND h.human=1';
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days')) || 30));
  const requestedTz = parseInt(url.searchParams.get('tz'));
  const tz = Number.isFinite(requestedTz) ? Math.max(-840, Math.min(840, requestedTz)) : -180;
  const key = [days, bots ? 1 : 0, tz].join('|'), hit = cache.get(key);
  if (hit && now - hit.t < 60000) return json(hit.body, 200, '', { 'Cache-Control': 'private, no-store' });
  try {
    await init(db);
    const off = tz * 60, local = new Date(now + off * 60000);
    const todayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - off * 60000;
    const since = now - days * 86400000;
    const q = (sql, ...a) => db.prepare(sql).bind(...a);
    const res = await db.batch([
      q(`SELECT device k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT browser k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT os k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT lang k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT ${REFX} k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT city||'|'||country k, COUNT(DISTINCT vid) n FROM tw_hits WHERE ts >= ?${hf} AND city<>'' GROUP BY k`, todayStart),
      q(`SELECT path k, COUNT(*) n FROM tw_hits WHERE ts >= ?${hf} GROUP BY k`, todayStart),
      q(`SELECT e.name k, COUNT(*) n FROM tw_events e JOIN tw_hits h ON h.hid=e.hid WHERE e.ts >= ?${evF} GROUP BY k`, todayStart),
      q(`SELECT device k, COUNT(DISTINCT vid) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT browser k, COUNT(DISTINCT vid) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT os k, COUNT(DISTINCT vid) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT lang k, COUNT(DISTINCT vid) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT ${REFX} k, COUNT(DISTINCT vid) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT city||'|'||country k, COUNT(DISTINCT vid) n FROM tw_hits WHERE city<>''${hf} GROUP BY k`),
      q(`SELECT path k, COUNT(*) n FROM tw_hits WHERE 1=1${hf} GROUP BY k`),
      q(`SELECT e.name k, COUNT(*) n FROM tw_events e JOIN tw_hits h ON h.hid=e.hid WHERE 1=1${evF} GROUP BY k`),
      q(`SELECT vid, ts, dur FROM tw_hits WHERE ts > ?${hf} ORDER BY vid, ts LIMIT 12000`, since),
    ]);
    const names = ['devices', 'browsers', 'oses', 'langs', 'refs', 'cities', 'pages', 'events'];
    const lists = {};
    names.forEach((n, i) => { lists[n] = { today: map(res[i].results), total: map(res[i + 8].results) }; });
    // Duración por VISITA: desde la entrada hasta la última señal (suma de las páginas vistas). Corte a los 30 min.
    const hits = res[16].results || [];
    const spans = []; let pv = null, pt = 0, s0 = 0, e0 = 0, open = false;
    for (const h of hits) {
      const end = h.ts + Math.max(0, h.dur || 0) * 1000;
      if (h.vid !== pv || h.ts - pt > 1800000) { if (open) spans.push(Math.round((e0 - s0) / 1000)); s0 = h.ts; e0 = end; open = true; }
      else if (end > e0) e0 = end;
      pv = h.vid; pt = h.ts;
    }
    if (open) spans.push(Math.round((e0 - s0) / 1000));
    const real = spans.filter(x => x > 0).sort((a, b) => a - b);
    const visit = real.length ? { med: real[Math.floor((real.length - 1) / 2)], avg: Math.round(real.reduce((a, b) => a + b, 0) / real.length) } : null;
    let rabbit = null;
    try {
      const r24 = await db.prepare('SELECT COUNT(*) n, COALESCE(SUM(coins),0) c FROM rabbit_wins WHERE at > ?').bind(now - 86400000).first();
      const rAll = await db.prepare('SELECT COUNT(*) n, COALESCE(SUM(coins),0) c FROM rabbit_wins').first();
      rabbit = { wins24: r24?.n || 0, coins24: r24?.c || 0, winsAll: rAll?.n || 0, coinsAll: rAll?.c || 0 };
    } catch (e) { rabbit = null; }
    const body = { ok: true, lists, visit, rabbit, truncated: hits.length >= 12000 };
    cache.set(key, { t: now, body }); if (cache.size > 24) cache.delete(cache.keys().next().value);
    return json(body, 200, '', { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    return json({ ok: false, error: 'breakdown_unavailable', detail: String(error?.message || error) }, 500);
  }
}
