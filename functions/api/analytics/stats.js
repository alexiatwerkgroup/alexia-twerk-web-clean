// GET /api/analytics/stats?days=30&tz=-180[&mini=1]  -> OWNER ONLY
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const rows = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || {};

export async function onRequestGet({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  await init(env.DB);
  const db = env.DB, url = new URL(request.url);
  const heads = { 'Set-Cookie': 'twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure' };
  const now = Date.now(), tz = Math.max(-840, Math.min(840, parseInt(url.searchParams.get('tz')) || -180));
  const off = tz * 60;
  if (url.searchParams.get('mini')) {
    const a = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits');
    const t = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?', now - 86400000);
    const o = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?', now - 300000);
    return json({ ok: true, visitors: a.u || 0, views: a.v || 0, today: t.u || 0, online: o.u || 0 }, 200, '', heads);
  }
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days')) || 30));
  const since = now - days * 86400000;
  const W = 'ts > ?';
  const tot = await one(db, `SELECT COUNT(*) views, COUNT(DISTINCT vid) uniq, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) newv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) regv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) avgdur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) avgscroll FROM tw_hits WHERE ${W}`, since);
  const single = await one(db, `SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(*)=1)`, since);
  const all = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u, MIN(ts) first FROM tw_hits');
  const win = async ms => one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?', now - ms);
  const [h24, d7, d30, online] = [await win(86400000), await win(7 * 86400000), await win(30 * 86400000), await win(300000)];
  const byDay = await rows(db, `SELECT date((ts/1000)+${off},'unixepoch') d, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY d ORDER BY d`, since);
  const byHour = await rows(db, `SELECT CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY h ORDER BY h`, since);
  const heat = await rows(db, `SELECT CAST(strftime('%w',(ts/1000)+${off},'unixepoch') AS INTEGER) w, CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v FROM tw_hits WHERE ${W} GROUP BY w,h`, since);
  const countries = await rows(db, `SELECT country c, COUNT(*) v, COUNT(DISTINCT vid) u, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) nv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) rv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} AND country<>'' GROUP BY country ORDER BY u DESC LIMIT 40`, since);
  const intent = await rows(db, `SELECT h.country c, COUNT(DISTINCT e.vid) n FROM tw_events e JOIN tw_hits h ON h.hid=e.hid WHERE e.ts > ? AND e.name IN ('pay_open','binance_ref','unlock_click') AND h.country<>'' GROUP BY h.country`, since);
  const cities = await rows(db, `SELECT city, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND city<>'' GROUP BY city, country ORDER BY u DESC LIMIT 15`, since);
  const dist = async col => rows(db, `SELECT ${col} k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND ${col}<>'' GROUP BY ${col} ORDER BY u DESC LIMIT 10`, since);
  const [devices, browsers, oses, langs, refs] = [await dist('device'), await dist('browser'), await dist('os'), await dist('lang'), await dist('ref')];
  const pages = await rows(db, `SELECT path, COUNT(*) v, COUNT(DISTINCT vid) u, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} GROUP BY path ORDER BY v DESC LIMIT 15`, since);
  const events = await rows(db, 'SELECT name, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ? GROUP BY name ORDER BY n DESC', since);
  const recent = await rows(db, 'SELECT hid, ts, substr(vid,1,6) vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll FROM tw_hits ORDER BY ts DESC LIMIT 40');
  const repeat = await one(db, `SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(DISTINCT date(ts/1000,'unixepoch'))>1)`, since);
  const unlocks = await one(db, "SELECT COUNT(*) n FROM jenny_unlocks WHERE via='coins'").catch(() => ({}));
  // best local hour per top country (visitor's own time zone)
  const raw = await rows(db, `SELECT country c, tz, ts FROM tw_hits WHERE ${W} AND country<>'' AND tz<>'' ORDER BY ts DESC LIMIT 20000`, since);
  const top = countries.slice(0, 8).map(x => x.c), loc = {}, fm = {};
  for (const r of raw) { if (!top.includes(r.c)) continue; let f = fm[r.tz]; if (!f) { try { f = fm[r.tz] = new Intl.DateTimeFormat('en-GB', { timeZone: r.tz, hour: 'numeric', hour12: false }); } catch { continue; } } const h = parseInt(f.format(new Date(r.ts))) % 24; (loc[r.c] = loc[r.c] || Array(24).fill(0))[h]++; }
  const bestLocal = Object.entries(loc).map(([c, a]) => ({ c, hours: a.map((n, h) => [h, n]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]) }));
  return json({ ok: true, days, tz, now, totals: { ...tot, single: single.n, repeat: repeat.n, allViews: all.v, allVisitors: all.u, since: all.first, unlocks: unlocks.n || 0 }, windows: { h24, d7, d30, online }, byDay, byHour, heat, countries, intent, cities, devices, browsers, oses, langs, refs, pages, events, recent, bestLocal }, 200, '', heads);
}
