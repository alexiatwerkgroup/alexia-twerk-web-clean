// Fast owner-only snapshot for the live sections of the analytics dashboard.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';
import { sweepBotWaves } from '../../_lib/botwaves.js';

const rows = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results || [];


const GAP = 30 * 60000, WINDOW = 120 * 86400000, TTL = 120000;
const visitCache = new Map(); // "i:<iph>" | "v:<vid>" -> { t, c }
async function visitCounts(db, now, iphs, vids) {
  const byIph = {}, byVid = {};
  const sessions = async (col, list, extra) => {
    const out = {};
    for (let i = 0; i < list.length; i += 80) {
      const part = list.slice(i, i + 80);
      for (const r of await rows(db,
        `SELECT k, SUM(CASE WHEN prev IS NULL OR ts - prev > ${GAP} THEN 1 ELSE 0 END) c
         FROM (SELECT ${col} k, ts, LAG(ts) OVER (PARTITION BY ${col} ORDER BY ts) prev
               FROM tw_hits WHERE human = 1 AND ts > ? ${extra} AND ${col} IN (${part.map(() => '?').join(',')}))
         GROUP BY k`, now - WINDOW, ...part)) out[r.k] = r.c;
    }
    return out;
  };
  const need = (prefix, list, target) => list.filter(k => { const c = visitCache.get(prefix + k); if (c && now - c.t < TTL) { target[k] = c.c; return false; } return true; });
  const missIph = need('i:', iphs, byIph), missVid = need('v:', vids, byVid);
  const [a, b] = await Promise.all([missIph.length ? sessions('iph', missIph, '') : {}, missVid.length ? sessions('vid', missVid, 'AND iph IS NULL') : {}]);
  for (const k of missIph) { byIph[k] = a[k] || 0; visitCache.set('i:' + k, { t: now, c: byIph[k] }); }
  for (const k of missVid) { byVid[k] = b[k] || 0; visitCache.set('v:' + k, { t: now, c: byVid[k] }); }
  if (visitCache.size > 2000) for (const k of [...visitCache.keys()].slice(0, 1000)) visitCache.delete(k);
  return { byIph, byVid };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const identity = await authenticate(request, env);
  if (!identity?.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const owner = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(owner?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);

  await init(env.DB);
  if (typeof waitUntil === 'function') waitUntil(sweepBotWaves(env.DB));
  const db = env.DB, now = Date.now(), cutoff = now - 150000;
  const onlineHits = await rows(db,
    `SELECT ts, COALESCE(last_active,ts) last_active_ts, last_engaged, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, uid, lat, lon
     FROM tw_hits WHERE (last_active > ? OR (last_active IS NULL AND ts > ?)) AND human = 1
     ORDER BY COALESCE(last_active,ts) DESC LIMIT 300`, cutoff, cutoff);
  const recent = await rows(db,
    `WITH ranked AS (
       SELECT hid, ts, uid, vid, iph, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll,
         ROW_NUMBER() OVER (PARTITION BY CASE WHEN uid IS NOT NULL THEN 'user:'||uid ELSE 'visitor:'||vid END ORDER BY ts DESC, hid DESC) rn
       FROM tw_hits WHERE human = 1 AND ts > ?
     ) SELECT hid, ts, uid, vid, iph, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll
       FROM ranked WHERE rn <= 5 ORDER BY ts DESC LIMIT 200`, now - 60 * 60000);
  const latestHit = await db.prepare('SELECT ts FROM tw_hits WHERE human = 1 ORDER BY ts DESC LIMIT 1').first();
  onlineHits.sort((a,b) => a.ts-b.ts);
  const active = {};
  for (const hit of onlineHits) {
    const visitor = active[hit.vid] || (active[hit.vid] = { vid: hit.vid, first: hit.ts, entered: hit.ts, pages: [], ref: hit.ref || '', isNew: hit.is_new, since: hit.ts });
    visitor.lastActive = Math.max(visitor.lastActive || 0, hit.last_active_ts || hit.ts);
    visitor.lastEngaged = Math.max(visitor.lastEngaged || 0, hit.last_engaged || 0);
    if (!visitor.last || hit.ts > visitor.last.ts) visitor.last = hit;
    if (!visitor.pages.includes(hit.path)) visitor.pages.push(hit.path);
    if (hit.uid) visitor.uid = hit.uid;
    if (hit.reg) visitor.reg = 1;
  }
  const online = Object.values(active).filter(v => v.lastActive > cutoff).sort((a,b) => b.lastActive-a.lastActive).slice(0,60);
  const pointGroups = {};
  for (const visitor of Object.values(active).filter(v => v.lastActive > cutoff && Number.isFinite(v.last?.lat) && Number.isFinite(v.last?.lon))) {
    const key = `${visitor.last.lat},${visitor.last.lon}`;
    const point = pointGroups[key] || (pointGroups[key] = { lat: visitor.last.lat, lon: visitor.last.lon, c: visitor.last.country || '', city: visitor.last.city || '', ts: visitor.lastActive, u: 0 });
    point.u++;
    point.ts = Math.max(point.ts, visitor.lastActive);
  }
  const live = Object.values(pointGroups).sort((a,b) => b.ts-a.ts).slice(0,200);
  if (online.length) {
    const ids = online.map(v => v.vid);
    const trail = await rows(db,
      `SELECT vid, ts FROM tw_hits WHERE vid IN (${ids.map(() => '?').join(',')}) AND ts > ? AND human = 1 ORDER BY vid, ts`,
      ...ids, now - 7 * 86400000);
    const sessions = {};
    for (const hit of trail) {
      const session = sessions[hit.vid];
      if (!session || hit.ts - session.last > 30 * 60000) sessions[hit.vid] = { start: hit.ts, last: hit.ts };
      else session.last = hit.ts;
    }
    for (const visitor of online) if (sessions[visitor.vid]) visitor.since = sessions[visitor.vid].start;
  }
  const ids = [...new Set(online.map(v => v.uid).concat(recent.map(v => v.uid)).filter(Boolean))];
  const profiles = {};
  if (ids.length) {
    const profileRows = await rows(db,
      `SELECT id, username, email, tokens, tier, streak, registered_at, last_login_date, last_seen_at, seconds_on_site, cuts_watched
       FROM profiles WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
    for (const profile of profileRows) profiles[profile.id] = profile;
  }
  const onlineIds = online.map(v => v.vid);
  const eventsByVisitor = {};
  if (onlineIds.length) {
    const events = await rows(db,
      `SELECT vid, ts, name, detail FROM tw_events WHERE ts > ? AND vid IN (${onlineIds.map(() => '?').join(',')}) ORDER BY ts DESC LIMIT 300`,
      now - 30 * 60000, ...onlineIds);
    for (const event of events) (eventsByVisitor[event.vid] ||= []).push(event);
  }
  const onlineList = online.map(v => ({
    id: v.vid.slice(0,6), user: v.uid ? (profiles[v.uid]?.username || '') : '',
    profile: v.uid ? (profiles[v.uid] || null) : null, reg: v.uid ? 1 : (v.reg ? 1 : 0),
    isNew: v.isNew ? 1 : 0, country: v.last?.country || '', city: v.last?.city || '',
    device: v.last?.device || '', browser: v.last?.browser || '', os: v.last?.os || '',
    ref: v.ref, path: v.last?.path || '/', pages: v.pages.slice(-5), entered: v.since,
    lastActive: v.lastActive, lastEngaged: v.lastEngaged || null, dur: v.last?.dur || 0, scroll: v.last?.scroll || 0,
    events: (eventsByVisitor[v.vid] || []).slice(0,6), lat: v.last?.lat ?? null, lon: v.last?.lon ?? null
  }));
  for (const hit of recent) { hit.user = profiles[hit.uid]?.username || ''; hit.profile = profiles[hit.uid] || null; }
  const evLast = await rows(db,
    `SELECT e.ts, e.name, e.detail, substr(e.vid,1,6) vid, e.vid full_vid, h.iph hit_iph, h.country, h.city,
            p.id profile_id, p.username
     FROM tw_events e LEFT JOIN tw_hits h ON h.hid=e.hid
     LEFT JOIN profiles p ON p.id=h.uid ORDER BY e.ts DESC LIMIT 25`);
  for (const event of evLast) event.profile = event.profile_id
    ? { id: event.profile_id, username: event.username || '' } : null;
  // Visitas por visitante, según IP (hash con sal; no se guarda la IP en crudo), tengan o no cuenta.
  // Una visita nueva = más de 30 min sin actividad. Los hits anteriores a esta función no tienen IP: se suman por cookie (vid).
  // Es accesorio: va con caché de 2 min, ventana de 120 días y un tope de 3 s; si falla o tarda, la vista en vivo sigue igual.
  try {
    const iphSet = new Set(), vidSet = new Set();
    for (const hit of recent) { if (hit.iph) iphSet.add(hit.iph); if (hit.vid) vidSet.add(hit.vid); }
    for (const event of evLast) { if (event.hit_iph) iphSet.add(event.hit_iph); if (event.full_vid) vidSet.add(event.full_vid); }
    const counts = await Promise.race([visitCounts(db, now, [...iphSet], [...vidSet]), new Promise(res => setTimeout(() => res(null), 3000))]);
    const visitsOf = (iph, vid) => counts ? (iph ? counts.byIph[iph] || 0 : 0) + (counts.byVid[vid] || 0) : null;
    for (const hit of recent) hit.visits = visitsOf(hit.iph, hit.vid);
    for (const event of evLast) event.visits = visitsOf(event.hit_iph, event.full_vid);
  } catch (error) { for (const hit of recent) hit.visits = null; for (const event of evLast) event.visits = null; }
  for (const hit of recent) delete hit.iph;
  for (const event of evLast) { delete event.full_vid; delete event.hit_iph; }
  return json({ ok: true, now, latestHit: latestHit?.ts || null, onlineList, recent, live, evLast, windows: { online: { u: onlineList.length } } }, 200, '', {
    'Cache-Control': 'private, no-store',
    'Set-Cookie': 'twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure'
  });
}
