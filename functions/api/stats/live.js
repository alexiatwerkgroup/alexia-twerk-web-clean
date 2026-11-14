// GET /api/stats/live?tz=-180[&lite=1]  -> SOLO DUEÑO. Lo que tiene que verse al instante (el panel lo pide cada 5 s).
import { json } from '../../_lib/http.js';
import { REAL_CTE, ONLINE_MS, CONFIRM_SECONDS, ownerOnly, NO_STORE, tzInfo, all } from '../../_lib/stats-core.js';

export async function onRequestGet({ request, env }) {
  const denied = await ownerOnly(request, env);
  if (denied) return denied;
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const { todayStart } = tzInfo(url, now);
  const since24 = now - 86400000, hourAgo = now - 3600000, onlineSince = now - ONLINE_MS;
  const lite = url.searchParams.get('lite') === '1';
  const counts = since => db.prepare(`WITH ${REAL_CTE} SELECT (SELECT COUNT(*) FROM cv) confirmed, (SELECT COUNT(*) FROM ci) interested, (SELECT COUNT(*) FROM tw_hits WHERE ts > ?1) loads, (SELECT COUNT(DISTINCT vid) FROM tw_hits WHERE ts > ?1) cookies, (SELECT COUNT(*) FROM tw_events WHERE ts > ?1 AND name <> 'vid_time') actions`).bind(since);
  const stmts = [
    counts(todayStart),
    counts(hourAgo),
    db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN registered_at >= datetime(?1/1000,'unixepoch') THEN 1 ELSE 0 END) today FROM profiles").bind(todayStart),
    db.prepare('SELECT COUNT(DISTINCT vid) n FROM tw_hits WHERE last_active > ?1 AND (dur > 0 OR human = 1 OR last_engaged IS NOT NULL OR uid IS NOT NULL OR last_active - ts > 2000)').bind(onlineSince),
  ];
  if (!lite) stmts.push(
    db.prepare(`SELECT h.vid, h.path, h.country, h.city, h.device, h.browser, h.os, h.ref, h.dur, h.scroll, h.uid, h.ts, h.last_active, h.last_engaged
      FROM tw_hits h JOIN (SELECT vid, MAX(last_active) la FROM tw_hits WHERE last_active > ?1 AND (dur > 0 OR human = 1 OR last_engaged IS NOT NULL OR uid IS NOT NULL OR last_active - ts > 2000) GROUP BY vid) x ON x.vid = h.vid AND x.la = h.last_active
      ORDER BY h.last_active DESC LIMIT 80`).bind(onlineSince),
    db.prepare(`SELECT e.ts, e.name, e.detail, e.vid, h.uid, h.country, h.city FROM tw_events e LEFT JOIN tw_hits h ON h.hid = e.hid WHERE e.name <> 'vid_time' ORDER BY e.ts DESC LIMIT 15`),
    db.prepare('SELECT id, username, country, registered_at, tier FROM profiles ORDER BY registered_at DESC LIMIT 6'),
  );
  const res = await db.batch(stmts);
  const first = i => (res[i].results || [])[0] || {};
  const t = first(0), h = first(1), acc = first(2), on = first(3);
  const body = {
    ok: true, now, confirmSeconds: CONFIRM_SECONDS, onlineSeconds: ONLINE_MS / 1000,
    today: { confirmed: t.confirmed || 0, interested: t.interested || 0, loads: t.loads || 0, cookies: t.cookies || 0, actions: t.actions || 0 },
    lastHour: { confirmed: h.confirmed || 0, interested: h.interested || 0, loads: h.loads || 0, cookies: h.cookies || 0, actions: h.actions || 0 },
    accounts: { total: acc.total || 0, today: acc.today || 0 },
    onlineCookies: on.n || 0,
  };
  if (lite) return json(body, 200, '', NO_STORE);

  // ---- quién está ahora, con la evidencia de cada uno (últimas 24 h) ----
  const seen = new Set(), online = [];
  for (const r of res[4].results || []) { if (seen.has(r.vid)) continue; seen.add(r.vid); online.push(r); }
  const vids = online.map(r => r.vid), ph = vids.map((_, i) => `?${i + 2}`).join(',');
  const [dur, ev] = vids.length ? await Promise.all([
    all(db, `SELECT vid, SUM(dur) dur, MAX(dur) maxdur, COUNT(*) loads, MAX(uid IS NOT NULL) acc FROM tw_hits WHERE ts > ?1 AND vid IN (${ph}) GROUP BY vid`, since24, ...vids),
    all(db, `SELECT vid, ts, name, detail FROM tw_events WHERE ts > ?1 AND name <> 'vid_time' AND vid IN (${ph}) ORDER BY ts DESC`, since24, ...vids),
  ]) : [[], []];
  const durBy = Object.fromEntries(dur.map(r => [r.vid, r]));
  const evBy = {};
  for (const e of ev) (evBy[e.vid] = evBy[e.vid] || []).push({ ts: e.ts, name: e.name, detail: e.detail });
  const uids = [...new Set(online.map(r => r.uid).concat((res[5].results || []).map(e => e.uid)).filter(Boolean))];
  const names = {};
  if (uids.length) for (const p of await all(db, `SELECT id, username FROM profiles WHERE id IN (${uids.map((_, i) => `?${i + 1}`).join(',')})`, ...uids)) names[p.id] = p.username || '';
  body.online = online.map(r => {
    const d = durBy[r.vid] || {}, events = evBy[r.vid] || [];
    const reasons = [];
    if ((d.maxdur || 0) >= CONFIRM_SECONDS) reasons.push('tiempo');
    if (r.uid || d.acc) reasons.push('cuenta');
    if (events.length) reasons.push('acción');
    return { vid: r.vid.slice(0, 6), user: r.uid ? names[r.uid] || '' : '', country: r.country, city: r.city, device: r.device, browser: r.browser, os: r.os, ref: r.ref, path: r.path,
      enteredAt: r.ts, lastSignal: r.last_active, lastEngaged: r.last_engaged || null, dur: r.dur || 0, scroll: r.scroll || 0, maxDur24h: d.maxdur || 0, loads24h: d.loads || 1, events: events.slice(0, 4), confirmed: true, reasons };
  });
  body.recentActions = (res[5].results || []).map(e => ({ ts: e.ts, name: e.name, detail: e.detail, country: e.country, city: e.city, user: e.uid ? names[e.uid] || '' : '' }));
  body.latestAccounts = res[6].results || [];
  return json(body, 200, '', NO_STORE);
}
