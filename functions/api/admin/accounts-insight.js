// Owner-only: altas reales, activación y origen de las cuentas registradas (la tarjeta vieja solo contaba cuentas que entraron logueadas).
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const cache = new Map();
const DAY = 86400000;
const pct = (n, d) => (d ? Math.round(1000 * n / d) / 10 : 0);
const mask = (e) => { e = String(e || ''); const i = e.indexOf('@'); return i < 0 ? e.slice(0, 2) + '***' : e.slice(0, Math.min(2, i)) + '***' + e.slice(i); };
const ms = (s) => { const t = Date.parse(String(s || '').replace(' ', 'T') + 'Z'); return Number.isFinite(t) ? t : null; };

export async function onRequestGet({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const days = Math.max(7, Math.min(180, parseInt(url.searchParams.get('days')) || 30));
  const hit = cache.get(days);
  if (hit && now - hit.t < 60000) return json(hit.body, 200, '', { 'Cache-Control': 'private, no-store' });
  try {
    await init(db);
    const q = (sql, ...a) => db.prepare(sql).bind(...a);
    const sinceIso = new Date(now - days * DAY).toISOString().slice(0, 10);
    const sinceMs = now - days * DAY;
    const [all, list, coin, vis] = await db.batch([
      q(`SELECT COUNT(*) total, SUM(seconds_on_site = 0) never_time, SUM(tier <> 'basic') paid, MAX(registered_at) last_reg FROM profiles`),
      q(`SELECT p.id, p.email, p.username, p.registered_at, p.country, p.tier, p.seconds_on_site s, p.cuts_watched c, p.last_seen_at, COALESCE(u.email_verified, 0) ver,
          (SELECT COUNT(*) FROM tw_hits WHERE uid = p.id) hits,
          (SELECT h.ref FROM tw_hits h WHERE h.vid = (SELECT vid FROM tw_hits WHERE uid = p.id ORDER BY ts LIMIT 1) ORDER BY h.ts LIMIT 1) ref0,
          (SELECT h.path FROM tw_hits h WHERE h.vid = (SELECT vid FROM tw_hits WHERE uid = p.id ORDER BY ts LIMIT 1) ORDER BY h.ts LIMIT 1) land0,
          (SELECT h.device FROM tw_hits h WHERE h.vid = (SELECT vid FROM tw_hits WHERE uid = p.id ORDER BY ts LIMIT 1) ORDER BY h.ts LIMIT 1) dev0
         FROM profiles p LEFT JOIN users u ON u.id = p.id ORDER BY p.registered_at DESC LIMIT 2000`),
      q(`SELECT email, COUNT(*) n FROM coin_movements WHERE kind = 'video_unlock' GROUP BY email`),
      q(`SELECT COUNT(DISTINCT vid) uniq, COUNT(DISTINCT CASE WHEN path IN ('/account','/account/','/account.html') THEN vid END) acc FROM tw_hits WHERE human = 1 AND ts > ?`, sinceMs),
    ]);
    const A = (all.results || [])[0] || {}, rows = list.results || [], V = (vis.results || [])[0] || {};
    const unlockBy = {}; for (const r of coin.results || []) unlockBy[String(r.email).toLowerCase()] = r.n;
    for (const r of rows) { r.reg = ms(r.registered_at); r.seen = ms(r.last_seen_at); r.unl = unlockBy[String(r.email).toLowerCase()] || 0; r.back = r.reg != null && r.seen != null && r.seen - r.reg > 3600000 && String(r.last_seen_at).slice(0, 10) > String(r.registered_at).slice(0, 10); }
    const inP = rows.filter(r => r.reg != null && r.reg > sinceMs);
    const n7 = rows.filter(r => r.reg > now - 7 * DAY).length, nPrev7 = rows.filter(r => r.reg <= now - 7 * DAY && r.reg > now - 14 * DAY).length;
    const n24 = rows.filter(r => r.reg > now - DAY).length, n30 = rows.filter(r => r.reg > now - 30 * DAY).length;
    const act7 = rows.filter(r => r.seen != null && r.seen > now - 7 * DAY).length, act30 = rows.filter(r => r.seen != null && r.seen > now - 30 * DAY).length;
    // Serie diaria (rellena días sin altas con 0).
    const byDay = {}; for (const r of inP) { const d = String(r.registered_at).slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; }
    const series = []; for (let i = Math.min(days, 60) - 1; i >= 0; i--) { const d = new Date(now - i * DAY).toISOString().slice(0, 10); series.push({ day: d, n: byDay[d] || 0 }); }
    const lastTs = ms(A.last_reg);
    const N = inP.length;
    const funnel = [
      ['Se registraron', N], ['Estuvieron 1 min o más', inP.filter(r => r.s >= 60).length], ['Volvieron otro día', inP.filter(r => r.back).length],
      ['Miraron cortes', inP.filter(r => r.c > 0).length], ['Desbloquearon con monedas', inP.filter(r => r.unl > 0).length], ['Tienen plan pago', inP.filter(r => r.tier !== 'basic').length],
    ].map(([label, c]) => ({ label, n: c, pct: pct(c, N) }));
    const src = {}; for (const r of inP) { const k = r.ref0 == null ? 'Sin dato (sin visita registrada)' : (r.ref0 || 'Directo / sin dato'); const g = src[k] = src[k] || { k, n: 0, min1: 0, back: 0 }; g.n++; if (r.s >= 60) g.min1++; if (r.back) g.back++; }
    const sources = Object.values(src).sort((a, b) => b.n - a.n).slice(0, 10).map(g => ({ k: g.k, n: g.n, min1: pct(g.min1, g.n), back: pct(g.back, g.n) }));
    const status = (r) => r.tier !== 'basic' ? 'plan pago' : r.unl > 0 ? 'desbloqueó' : r.c > 0 ? 'miró cortes' : r.back ? 'volvió' : r.s >= 60 ? 'se quedó 1 min+' : r.s > 0 ? 'se fue rápido' : 'nunca activa';
    const recent = rows.slice(0, 30).map(r => ({ ts: r.reg, who: r.username || mask(r.email), ver: !!r.ver, ref: r.ref0 == null ? '—' : (r.ref0 || 'directo'), land: r.land0 || '', dev: r.dev0 || '', country: r.country || '', secs: r.s || 0, cuts: r.c || 0, unl: r.unl, seen: r.seen, tier: r.tier, status: status(r) }));
    const body = {
      ok: true, days,
      totals: { total: A.total || 0, n24, n7, nPrev7, n30, lastReg: lastTs, act7, act30, neverTime: A.never_time || 0, paid: A.paid || 0, verified: rows.filter(r => r.ver).length, withCountry: rows.filter(r => r.country).length },
      period: { signups: N, visitors: V.uniq || 0, accountVisitors: V.acc || 0, convVisitors: pct(N, V.uniq || 0), convAccount: pct(N, V.acc || 0) },
      series, funnel, sources, recent,
    };
    cache.set(days, { t: now, body }); if (cache.size > 8) cache.delete(cache.keys().next().value);
    return json(body, 200, '', { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    return json({ ok: false, error: 'accounts_unavailable', detail: String(error?.message || error) }, 500);
  }
}
