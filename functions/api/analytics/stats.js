// GET /api/analytics/stats?days=30&tz=-180[&mini=1]  -> OWNER ONLY
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const rows = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || {};

// Cache of the cheap "mini" counter (owner only). It scans the whole tw_hits table,
// so it must not run on every poll. 5 min per worker instance is enough for a live counter.
let miniCache = { t: 0, body: null };

async function buildStats({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  await init(env.DB);
  const db = env.DB, url = new URL(request.url);
  const heads = { 'Cache-Control': 'private, no-store', 'Set-Cookie': 'twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure' };
  const now = Date.now(), tz = Math.max(-840, Math.min(840, parseInt(url.searchParams.get('tz')) || -180));
  const off = tz * 60;
  if (url.searchParams.get('mini')) {
    if (miniCache.body && now - miniCache.t < 300000) return json(miniCache.body, 200, '', heads);
    const a = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1');
    const t = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1 AND ts > ?', now - 86400000);
    const o = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1 AND ts > ?', now - 300000);
    const body = { ok: true, visitors: a.u || 0, views: a.v || 0, today: t.u || 0, online: o.u || 0 };
    miniCache = { t: now, body };
    return json(body, 200, '', heads);
  }
  const bots = url.searchParams.get('bots') === '1', hf = bots ? '' : ' AND human = 1';
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days')) || 30));
  const since = now - days * 86400000;
  const W = 'ts > ?' + hf;
  const tot = await one(db, `SELECT COUNT(*) views, COUNT(DISTINCT vid) uniq, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) newv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) regv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) avgdur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) avgscroll FROM tw_hits WHERE ${W}`, since);
  const single = await one(db, `SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(*)=1)`, since);
  const all = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u, MIN(ts) first FROM tw_hits WHERE 1=1' + hf);
  const win = async ms => one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?' + hf, now - ms);
  const [h24, d7, d30, online] = await Promise.all([win(86400000), win(7 * 86400000), win(30 * 86400000), win(300000)]);
  const byDay = await rows(db, `SELECT date((ts/1000)+${off},'unixepoch') d, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY d ORDER BY d`, since);
  const byHour = await rows(db, `SELECT CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY h ORDER BY h`, since);
  const heat = await rows(db, `SELECT CAST(strftime('%w',(ts/1000)+${off},'unixepoch') AS INTEGER) w, CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v FROM tw_hits WHERE ${W} GROUP BY w,h`, since);
  const countries = await rows(db, `SELECT country c, COUNT(*) v, COUNT(DISTINCT vid) u, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) nv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) rv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} AND country<>'' GROUP BY country ORDER BY u DESC LIMIT 40`, since);
  const intent = await rows(db, `SELECT h.country c, COUNT(DISTINCT e.vid) n FROM tw_events e JOIN tw_hits h ON h.hid=e.hid WHERE e.ts > ? AND e.name IN ('pay_open','binance_ref','unlock_click') AND h.country<>'' GROUP BY h.country`, since);
  const cities = await rows(db, `SELECT city, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND city<>'' GROUP BY city, country ORDER BY u DESC LIMIT 15`, since);
  const dist = async col => rows(db, `SELECT ${col} k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND ${col}<>'' GROUP BY ${col} ORDER BY u DESC LIMIT 10`, since);
  const [devices, browsers, oses, langs, refs] = await Promise.all([dist('device'), dist('browser'), dist('os'), dist('lang'), dist('ref')]);
  const pages = await rows(db, `SELECT path, COUNT(*) v, COUNT(DISTINCT vid) u, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} GROUP BY path ORDER BY v DESC LIMIT 15`, since);
  const events = await rows(db, 'SELECT name, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ? GROUP BY name ORDER BY n DESC', since);
  const recent = await rows(db, 'SELECT hid, ts, uid, substr(vid,1,6) vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, human FROM tw_hits WHERE 1=1' + hf + ' ORDER BY ts DESC LIMIT 40');
  const repeat = await one(db, `SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(DISTINCT date(ts/1000,'unixepoch'))>1)`, since);
  const unlocks = await one(db, "SELECT COUNT(*) n FROM jenny_unlocks WHERE via='coins'").catch(() => ({}));

  // ---- v2: bots filtered, peaks, live map, funnel, promo marks ----
  const botU = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 0 AND ts > ?', since);
  const marks = await rows(db, 'SELECT id, ts, label, channel FROM tw_marks WHERE ts > ? ORDER BY ts DESC LIMIT 100', now - 90 * 86400000);
  const hrs = await rows(db, `SELECT (ts/3600000) b, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?${hf} GROUP BY b ORDER BY b`, now - 14 * 86400000);
  const series = []; const nowB = Math.floor(now / 3600000);
  for (let b = nowB - 14 * 24 + 1, i = 0; b <= nowB; b++) { const r = hrs.find(x => x.b === b); series.push({ b, u: r ? r.u : 0 }); }
  const vals = series.map(x => x.u), mean = vals.reduce((a, c) => a + c, 0) / Math.max(1, vals.length), sd = Math.sqrt(vals.reduce((a, c) => a + (c - mean) ** 2, 0) / Math.max(1, vals.length));
  const peaks = [];
  const peakHours=series.filter(x=>x.u>=3&&x.u>=mean+2*Math.max(sd,0.8));
  let peakRefs=[],peakCountries=[];
  if(peakHours.length){
    [peakRefs,peakCountries]=await Promise.all([
      rows(db,`SELECT (ts/3600000) b,ref k,COUNT(DISTINCT vid) u FROM tw_hits WHERE ts>?${hf} AND ref<>'' GROUP BY b,ref ORDER BY u DESC`,now-14*86400000),
      rows(db,`SELECT (ts/3600000) b,country k,COUNT(DISTINCT vid) u FROM tw_hits WHERE ts>?${hf} AND country<>'' GROUP BY b,country ORDER BY u DESC`,now-14*86400000)
    ]);
  }
  const refByHour=new Map(),countryByHour=new Map();for(const r of peakRefs)if(!refByHour.has(r.b))refByHour.set(r.b,r);for(const r of peakCountries)if(!countryByHour.has(r.b))countryByHour.set(r.b,r);
  for(const x of peakHours){const rf=refByHour.get(x.b)||{},ct=countryByHour.get(x.b)||{};peaks.push({ts:x.b*3600000,u:x.u,x:mean?+(x.u/mean).toFixed(1):null,ref:rf.k||'',refU:rf.u||0,country:ct.k||'',countryU:ct.u||0});}
  const mins = await rows(db, `SELECT (ts/300000) b, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?${hf} GROUP BY b ORDER BY b`, now - 48 * 3600000);
  const live = await rows(db, `SELECT lat, lon, country c, city, MAX(ts) ts, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?${hf} AND lat IS NOT NULL GROUP BY lat, lon ORDER BY ts DESC LIMIT 200`, now - 30 * 60000);
  // ---- who is online right now (last activity < 2.5 min; hit time + visible seconds) ----
  const rec = await rows(db, `SELECT ts, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, uid FROM tw_hits WHERE ts > ?${hf} ORDER BY ts`, now - 30 * 60000);
  const OV = {};
  for (const h of rec) { const v = OV[h.vid] = OV[h.vid] || { vid: h.vid, first: h.ts, pages: [], ref: h.ref || '', isNew: h.is_new, since: h.ts };
    v.last = h; v.lastActive = Math.max(v.lastActive || 0, h.ts + (h.dur || 0) * 1000); if (!v.pages.length || v.pages[v.pages.length - 1] !== h.path) v.pages.push(h.path); if (h.uid) v.uid = h.uid; if (h.reg) v.reg = 1; }
  const onl = Object.values(OV).filter(v => v.lastActive > now - 150000).sort((a, b) => b.lastActive - a.lastActive).slice(0, 60);
  let uname = {}, profiles = {};
  const uids = [...new Set(onl.map(v => v.uid).concat(recent.map(v => v.uid)).filter(Boolean))];
  if (uids.length) { const ur = await rows(db, `SELECT id, username, email, tokens, tier, streak, registered_at, last_login_date, last_seen_at, seconds_on_site, cuts_watched FROM profiles WHERE id IN (${uids.map(() => '?').join(',')})`, ...uids); ur.forEach(u => { uname[u.id] = u.username || ''; profiles[u.id] = u; }); }
  let evBy = {};
  if (onl.length) { const er = await rows(db, `SELECT vid, ts, name, detail FROM tw_events WHERE ts > ? AND vid IN (${onl.map(() => '?').join(',')}) ORDER BY ts DESC`, now - 30 * 60000, ...onl.map(v => v.vid)); er.forEach(e => { (evBy[e.vid] = evBy[e.vid] || []).push({ ts: e.ts, name: e.name, detail: e.detail }); }); }
  const onlineList = onl.map(v => ({ id: v.vid.slice(0, 6), user: v.uid ? (uname[v.uid] || '') : '', profile: v.uid ? (profiles[v.uid] || null) : null, reg: v.reg ? 1 : 0, isNew: v.isNew ? 1 : 0, country: v.last.country, city: v.last.city, device: v.last.device, browser: v.last.browser, os: v.last.os, ref: v.ref, path: v.last.path, pages: v.pages.slice(-5), entered: v.since, lastActive: v.lastActive, dur: v.last.dur || 0, scroll: v.last.scroll || 0, events: (evBy[v.vid] || []).slice(0, 6) }));
  recent.forEach(v => { v.user = uname[v.uid] || ''; v.profile = profiles[v.uid] || null; });
  const evU = await rows(db, 'SELECT name, detail, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ? GROUP BY name, detail ORDER BY n DESC', since);
  const evLast = await rows(db, "SELECT e.ts, e.name, e.detail, substr(e.vid,1,6) vid, h.country, h.city FROM tw_events e LEFT JOIN tw_hits h ON h.hid = e.hid ORDER BY e.ts DESC LIMIT 25");
  const landed = await one(db, `SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND path LIKE '/jenny%'`, since);
  const regs = await one(db, 'SELECT COUNT(*) n FROM profiles').catch(() => ({}));
  // best local hour per top country (visitor's own time zone)
  const raw = await rows(db, `SELECT country c, tz, ts FROM tw_hits WHERE ${W} AND country<>'' AND tz<>'' ORDER BY ts DESC LIMIT 20000`, since);
  const top = countries.slice(0, 8).map(x => x.c), loc = {}, fm = {};
  for (const r of raw) { if (!top.includes(r.c)) continue; let f = fm[r.tz]; if (!f) { try { f = fm[r.tz] = new Intl.DateTimeFormat('en-GB', { timeZone: r.tz, hour: 'numeric', hour12: false }); } catch { continue; } } const h = parseInt(f.format(new Date(r.ts))) % 24; (loc[r.c] = loc[r.c] || Array(24).fill(0))[h]++; }
  const bestLocal = Object.entries(loc).map(([c, a]) => ({ c, hours: a.map((n, h) => [h, n]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]) }));
  return json({ ok: true, days, tz, now, totals: { ...tot, single: single.n, repeat: repeat.n, allViews: all.v, allVisitors: all.u, since: all.first, unlocks: unlocks.n || 0 }, windows: { h24, d7, d30, online }, byDay, byHour, heat, countries, intent, cities, devices, browsers, oses, langs, refs, pages, events, recent, bestLocal, v2: { onlineList,  botsFiltered: botU.u || 0, includeBots: bots, marks, peaks, series, mean: +mean.toFixed(2), mins, live, evU, evLast, landed: landed.u || 0, profiles: regs.n || 0 } }, 200, '', heads);
}

// Multiple open owner panels share one short-lived snapshot rather than flooding D1.
const fullResponses=new Map(),fullFlights=new Map();
export async function onRequestGet(context){
 const {request,env}=context,url=new URL(request.url);
 if(url.searchParams.get('mini'))return buildStats(context);
 const identity=await authenticate(request,env);if(!identity?.sub)return json({ok:false,error:'owner_only'},403);
 const owner=await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();if(String(owner?.email||'').toLowerCase()!==OWNER)return json({ok:false,error:'owner_only'},403);
 const key=['days','bots','tz'].map(k=>url.searchParams.get(k)||'').join('|'),cached=fullResponses.get(key);
 if(cached&&Date.now()-cached.at<5000)return cached.response.clone();
 if(fullFlights.has(key))return (await fullFlights.get(key)).clone();
 const flight=buildStats(context);fullFlights.set(key,flight);
 try{const response=await flight;if(response.status===200){fullResponses.set(key,{at:Date.now(),response:response.clone()});if(fullResponses.size>24)fullResponses.delete(fullResponses.keys().next().value)}return response;}finally{fullFlights.delete(key)}
}
