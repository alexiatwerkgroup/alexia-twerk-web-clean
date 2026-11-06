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
  const now = Date.now(), requestedTz = parseInt(url.searchParams.get('tz'));
  const tz = Number.isFinite(requestedTz) ? Math.max(-840, Math.min(840, requestedTz)) : -180;
  const off = tz * 60;
  const localNow = new Date(now + off * 60000);
  const todayStart = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()) - off * 60000;
  if (url.searchParams.get('mini')) {
    let base = miniCache.body;
    if (!base || now - miniCache.t >= 300000) {
      const a = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1');
      const t = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1 AND ts > ?', now - 86400000);
      base = { visitors: a.u || 0, views: a.v || 0, today: t.u || 0 };
      miniCache = { t: now, body: base };
    }
    const o = await one(db, 'SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE human = 1 AND (last_active > ? OR (last_active IS NULL AND ts > ?))', now - 150000, now - 150000);
    const body = { ok: true, ...base, online: o.u || 0 };
    return json(body, 200, '', heads);
  }
  const bots = url.searchParams.get('bots') === '1', hf = bots ? '' : ' AND human = 1';
  const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get('days')) || 30));
  const since = now - days * 86400000;
  const W = 'ts > ?' + hf;
  const mainResults=await db.batch([
    db.prepare(`SELECT COUNT(*) views, COUNT(DISTINCT vid) uniq, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) newv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) regv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) avgdur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) avgscroll FROM tw_hits WHERE ${W}`).bind(since),
    db.prepare(`SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(*)=1)`).bind(since),
    db.prepare('SELECT COUNT(*) v, COUNT(DISTINCT vid) u, MIN(ts) first FROM tw_hits WHERE 1=1' + hf),
    db.prepare(`SELECT date((ts/1000)+${off},'unixepoch') d, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY d ORDER BY d`).bind(since),
    db.prepare(`SELECT CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} GROUP BY h ORDER BY h`).bind(since),
    db.prepare(`SELECT CAST(strftime('%w',(ts/1000)+${off},'unixepoch') AS INTEGER) w, CAST(strftime('%H',(ts/1000)+${off},'unixepoch') AS INTEGER) h, COUNT(*) v FROM tw_hits WHERE ${W} GROUP BY w,h`).bind(since),
    db.prepare(`SELECT country c, COUNT(*) v, COUNT(DISTINCT vid) u, COUNT(DISTINCT CASE WHEN is_new=1 THEN vid END) nv, COUNT(DISTINCT CASE WHEN reg=1 THEN vid END) rv, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} AND country<>'' GROUP BY country ORDER BY u DESC LIMIT 40`).bind(since),
    db.prepare(`SELECT h.country c, COUNT(DISTINCT e.vid) n FROM tw_events e JOIN tw_hits h ON h.hid=e.hid WHERE e.ts > ? AND e.name IN ('pay_open','binance_ref','unlock_click') AND h.country<>'' GROUP BY h.country`).bind(since),
    db.prepare(`SELECT city, country c, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND city<>'' GROUP BY city, country ORDER BY u DESC LIMIT 15`).bind(since),
    db.prepare(`SELECT path, COUNT(*) v, COUNT(DISTINCT vid) u, ROUND(AVG(CASE WHEN dur>0 THEN dur END)) dur, ROUND(AVG(CASE WHEN scroll>0 THEN scroll END)) sc FROM tw_hits WHERE ${W} GROUP BY path ORDER BY v DESC LIMIT 15`).bind(since),
    db.prepare('SELECT name, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ? GROUP BY name ORDER BY n DESC').bind(since),
    db.prepare('SELECT hid, ts, uid, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, human FROM tw_hits WHERE 1=1' + hf + ' ORDER BY ts DESC LIMIT 40'),
    db.prepare(`SELECT COUNT(*) n FROM (SELECT vid FROM tw_hits WHERE ${W} GROUP BY vid HAVING COUNT(DISTINCT date(ts/1000,'unixepoch'))>1)`).bind(since),
    db.prepare('SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?' + hf).bind(now-86400000),
    db.prepare('SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?' + hf).bind(now-7*86400000),
    db.prepare('SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts > ?' + hf).bind(now-30*86400000),
    db.prepare('SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE (last_active > ? OR (last_active IS NULL AND ts > ?))' + hf).bind(now-150000, now-150000),
    db.prepare(`SELECT device k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND device<>'' GROUP BY device ORDER BY u DESC LIMIT 10`).bind(since),
    db.prepare(`SELECT browser k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND browser<>'' GROUP BY browser ORDER BY u DESC LIMIT 10`).bind(since),
    db.prepare(`SELECT os k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND os<>'' GROUP BY os ORDER BY u DESC LIMIT 10`).bind(since),
    db.prepare(`SELECT lang k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND lang<>'' GROUP BY lang ORDER BY u DESC LIMIT 10`).bind(since),
    db.prepare(`SELECT ref k, COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND ref<>'' GROUP BY ref ORDER BY u DESC LIMIT 10`).bind(since),
  ]);
  const tot=(mainResults[0].results||[])[0]||{};
  const single=(mainResults[1].results||[])[0]||{};
  const all=(mainResults[2].results||[])[0]||{};
  const byDay=mainResults[3].results||[];
  const byHour=mainResults[4].results||[];
  const heat=mainResults[5].results||[];
  const countries=mainResults[6].results||[];
  const intent=mainResults[7].results||[];
  const cities=mainResults[8].results||[];
  const pages=mainResults[9].results||[];
  const events=mainResults[10].results||[];
  const recent=mainResults[11].results||[];
  const repeat=(mainResults[12].results||[])[0]||{};
  const h24=(mainResults[13].results||[])[0]||{};
  const d7=(mainResults[14].results||[])[0]||{};
  const d30=(mainResults[15].results||[])[0]||{};
  const online=(mainResults[16].results||[])[0]||{};
  const devices=mainResults[17].results||[];
  const browsers=mainResults[18].results||[];
  const oses=mainResults[19].results||[];
  const langs=mainResults[20].results||[];
  const refs=mainResults[21].results||[];
  const today = await one(db, 'SELECT COUNT(*) v, COUNT(DISTINCT vid) u FROM tw_hits WHERE ts >= ? AND ts < ?' + hf, todayStart, now);
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
  const rec = await rows(db, `SELECT ts, COALESCE(last_active,ts) last_active_ts, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, uid FROM tw_hits WHERE (last_active > ? OR (last_active IS NULL AND ts > ?))${hf} ORDER BY COALESCE(last_active,ts)`, now - 150000, now - 150000);
  const OV = {};
  for (const h of rec) { const v = OV[h.vid] = OV[h.vid] || { vid: h.vid, first: h.ts, pages: [], ref: h.ref || '', isNew: h.is_new, since: h.ts };
    v.last = h; v.lastActive = Math.max(v.lastActive || 0, h.last_active_ts || h.ts); if (!v.pages.length || v.pages[v.pages.length - 1] !== h.path) v.pages.push(h.path); if (h.uid) v.uid = h.uid; if (h.reg) v.reg = 1; }
  const onl = Object.values(OV).filter(v => v.lastActive > now - 150000).sort((a, b) => b.lastActive - a.lastActive).slice(0, 60);
  // The 30-minute online trail above is only for recent pages. Find each visitor's
  // current session start separately so long visits do not get shown as 8–30 min old.
  if (onl.length) {
    const vids = onl.map(v => v.vid);
    const trail = await rows(db, `SELECT vid, ts FROM tw_hits WHERE vid IN (${vids.map(() => '?').join(',')}) AND ts > ?${hf} ORDER BY vid, ts`, ...vids, now - 7 * 86400000);
    const sessions = {};
    for (const hit of trail) {
      const session = sessions[hit.vid];
      if (!session || hit.ts - session.last > 30 * 60000) sessions[hit.vid] = { start: hit.ts, last: hit.ts };
      else session.last = hit.ts;
    }
    for (const visitor of onl) if (sessions[visitor.vid]) visitor.since = sessions[visitor.vid].start;
  }
  let uname = {}, profiles = {};
  const uids = [...new Set(onl.map(v => v.uid).concat(recent.map(v => v.uid)).filter(Boolean))];
  if (uids.length) { const ur = await rows(db, `SELECT id, username, email, tokens, tier, streak, registered_at, last_login_date, last_seen_at, seconds_on_site, cuts_watched FROM profiles WHERE id IN (${uids.map(() => '?').join(',')})`, ...uids); ur.forEach(u => { uname[u.id] = u.username || ''; profiles[u.id] = u; }); }
  let evBy = {};
  if (onl.length) { const er = await rows(db, `SELECT vid, ts, name, detail FROM tw_events WHERE ts > ? AND vid IN (${onl.map(() => '?').join(',')}) ORDER BY ts DESC`, now - 30 * 60000, ...onl.map(v => v.vid)); er.forEach(e => { (evBy[e.vid] = evBy[e.vid] || []).push({ ts: e.ts, name: e.name, detail: e.detail }); }); }
  for (const h of rec) if (OV[h.vid] && OV[h.vid].lastActive > now - 150000) (evBy[h.vid] = evBy[h.vid] || []).push({ ts: h.ts, name: 'page_view', detail: h.path });
  const onlineList = onl.map(v => ({ id: v.vid.slice(0, 6), user: v.uid ? (uname[v.uid] || '') : '', profile: v.uid ? (profiles[v.uid] || null) : null, reg: v.uid ? 1 : (v.reg ? 1 : 0), isNew: v.isNew ? 1 : 0, country: v.last.country, city: v.last.city, device: v.last.device, browser: v.last.browser, os: v.last.os, ref: v.ref, path: v.last.path, pages: v.pages.slice(-5), entered: v.since, lastActive: v.lastActive, dur: v.last.dur || 0, scroll: v.last.scroll || 0, events: (evBy[v.vid] || []).sort((a, b) => b.ts - a.ts).slice(0, 6) }));
  recent.forEach(v => { v.user = uname[v.uid] || ''; v.profile = profiles[v.uid] || null; });
  const evU = await rows(db, 'SELECT name, detail, COUNT(*) n, COUNT(DISTINCT vid) u FROM tw_events WHERE ts > ? GROUP BY name, detail ORDER BY n DESC', since);
  const evLast = await rows(db, "SELECT e.ts, e.name, e.detail, substr(e.vid,1,6) vid, h.country, h.city, p.id profile_id, p.username FROM tw_events e LEFT JOIN tw_hits h ON h.hid = e.hid LEFT JOIN profiles p ON p.id = h.uid ORDER BY e.ts DESC LIMIT 25");
  for (const event of evLast) event.profile = event.profile_id ? { id: event.profile_id, username: event.username || '' } : null;
  const landed = await one(db, `SELECT COUNT(DISTINCT vid) u FROM tw_hits WHERE ${W} AND path LIKE '/jenny%'`, since);
  const regs = await one(db, 'SELECT COUNT(*) n FROM profiles').catch(() => ({}));
  const registeredLocations = await rows(db, `WITH latest AS (SELECT h.uid,h.country,h.city,ROW_NUMBER() OVER (PARTITION BY h.uid ORDER BY COALESCE(h.last_active,h.ts) DESC) rank FROM tw_hits h JOIN (SELECT id FROM profiles ORDER BY registered_at DESC LIMIT 25) p ON p.id=h.uid WHERE h.uid IS NOT NULL AND h.country<>'') SELECT uid,country,city FROM latest WHERE rank=1`);
  // best local hour per top country (visitor's own time zone)
  const raw = await rows(db, `SELECT country c, tz, ts FROM tw_hits WHERE ${W} AND country<>'' AND tz<>'' ORDER BY ts DESC LIMIT 20000`, since);
  const top = countries.slice(0, 8).map(x => x.c), loc = {}, fm = {};
  for (const r of raw) {
    if(!top.includes(r.c)||typeof r.tz!=='string')continue;
    const stamp=Number(r.ts);if(!Number.isFinite(stamp))continue;
    let f=Object.prototype.hasOwnProperty.call(fm,r.tz)?fm[r.tz]:null;
    if(!f){try{f=fm[r.tz]=new Intl.DateTimeFormat('en-GB',{timeZone:r.tz,hour:'numeric',hour12:false})}catch{continue}}
    let h;try{h=parseInt(f.format(new Date(stamp)))%24}catch{continue}if(!Number.isFinite(h))continue;
    (loc[r.c]=loc[r.c]||Array(24).fill(0))[h]++;
  }
  const bestLocal = Object.entries(loc).map(([c, a]) => ({ c, hours: a.map((n, h) => [h, n]).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]) }));
  return json({ ok: true, days, tz, now, totals: { ...tot, single: single.n, repeat: repeat.n, allViews: all.v, allVisitors: all.u, todayViews: today.v || 0, todayVisitors: today.u || 0, since: all.first, unlocks: unlocks.n || 0 }, windows: { h24, d7, d30, online }, byDay, byHour, heat, countries, intent, cities, devices, browsers, oses, langs, refs, pages, events, recent, bestLocal, v2: { onlineList, registeredLocations, botsFiltered: botU.u || 0, includeBots: bots, marks, peaks, series, mean: +mean.toFixed(2), mins, live, evU, evLast, landed: landed.u || 0, profiles: regs.n || 0 } }, 200, '', heads);
}

// Multiple open owner panels share one short-lived snapshot rather than flooding D1.
const fullResponses=new Map(),fullFlights=new Map();
export async function onRequestGet(context){
 const {request,env}=context,url=new URL(request.url);
 if(url.searchParams.get('mini'))return buildStats(context);
 const identity=await authenticate(request,env);if(!identity?.sub)return json({ok:false,error:'owner_only'},403);
 const owner=await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();if(String(owner?.email||'').toLowerCase()!==OWNER)return json({ok:false,error:'owner_only'},403);
 const key=['days','bots','tz'].map(k=>url.searchParams.get(k)||'').join('|'),cached=fullResponses.get(key);
 const respond=record=>new Response(record.body,{status:record.status,headers:record.headers});
 if(cached&&Date.now()-cached.at<60000)return respond(cached);
 let flight=fullFlights.get(key);
 if(!flight){
   flight=(async()=>{try{
     const response=await buildStats(context),record={at:Date.now(),body:await response.text(),status:response.status,headers:[...response.headers]};
     if(record.status===200){fullResponses.set(key,record);if(fullResponses.size>24)fullResponses.delete(fullResponses.keys().next().value)}return record;
   }catch(error){return {body:JSON.stringify({ok:false,error:'traffic_unavailable',detail:String(error?.message||error)}),status:500,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}}}finally{fullFlights.delete(key)}})();
   fullFlights.set(key,flight);
 }
 return respond(await flight);
}
