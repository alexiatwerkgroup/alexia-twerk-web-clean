// Fast owner-only snapshot for the live sections of the analytics dashboard.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const rows = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results || [];

export async function onRequestGet({ request, env }) {
  const identity = await authenticate(request, env);
  if (!identity?.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const owner = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(identity.sub).first();
  if (String(owner?.email || '').toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);

  await init(env.DB);
  const db = env.DB, now = Date.now(), cutoff = now - 150000;
  const onlineHits = await rows(db,
    `SELECT ts, COALESCE(last_active,ts) last_active_ts, last_engaged, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll, uid, lat, lon
     FROM tw_hits WHERE (last_active > ? OR (last_active IS NULL AND ts > ?)) AND human = 1
     ORDER BY COALESCE(last_active,ts) DESC LIMIT 300`, cutoff, cutoff);
  const recent = await rows(db,
    `WITH ranked AS (
       SELECT hid, ts, uid, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll,
         ROW_NUMBER() OVER (PARTITION BY CASE WHEN uid IS NOT NULL THEN 'user:'||uid ELSE 'visitor:'||vid END ORDER BY ts DESC, hid DESC) rn
       FROM tw_hits WHERE human = 1 AND ts > ?
     ) SELECT hid, ts, uid, vid, path, country, city, device, browser, os, ref, is_new, reg, dur, scroll
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
    `SELECT e.ts, e.name, e.detail, substr(e.vid,1,6) vid, h.country, h.city,
            p.id profile_id, p.username
     FROM tw_events e LEFT JOIN tw_hits h ON h.hid=e.hid
     LEFT JOIN profiles p ON p.id=h.uid ORDER BY e.ts DESC LIMIT 25`);
  for (const event of evLast) event.profile = event.profile_id
    ? { id: event.profile_id, username: event.username || '' } : null;
  return json({ ok: true, now, latestHit: latestHit?.ts || null, onlineList, recent, live, evLast, windows: { online: { u: onlineList.length } } }, 200, '', {
    'Cache-Control': 'private, no-store',
    'Set-Cookie': 'twx=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure'
  });
}
