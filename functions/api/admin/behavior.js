// Owner-only: comportamiento real de los visitantes (tiempo por visita, páginas, recorridos, embudo, orígenes).
// Separado de traffic-stats para que un fallo acá nunca rompa el panel principal.
import { authenticate } from '../../_lib/auth.js';
import { json } from '../../_lib/http.js';
import { init, OWNER } from '../../_lib/analytics.js';

const cache = new Map();
const LIMIT = 15000;
const GAP = 1800000; // 30 min sin actividad = visita nueva
const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
const pct = (n, d) => (d ? Math.round(1000 * n / d) / 10 : 0);
const BUCKETS = [['0 s (sin señal)', 0, 0], ['1–9 s', 1, 9], ['10–29 s', 10, 29], ['30–59 s', 30, 59], ['1–3 min', 60, 179], ['3–10 min', 180, 599], ['10 min o más', 600, 1e9]];

export async function onRequestGet({ request, env }) {
  const p = await authenticate(request, env);
  if (!p || !p.sub) return json({ ok: false, error: 'owner_only' }, 403);
  const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first();
  if (!u || String(u.email).toLowerCase() !== OWNER) return json({ ok: false, error: 'owner_only' }, 403);
  const db = env.DB, url = new URL(request.url), now = Date.now();
  const bots = url.searchParams.get('bots') === '1';
  const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get('days')) || 7));
  const key = days + '|' + (bots ? 1 : 0), hit = cache.get(key);
  if (hit && now - hit.t < 60000) return json(hit.body, 200, '', { 'Cache-Control': 'private, no-store' });
  try {
    await init(db);
    const since = now - days * 86400000;
    const q = (sql, ...a) => db.prepare(sql).bind(...a);
    const [hitsRes, evRes, qualRes] = await db.batch([
      q(`SELECT hid, vid, ts, path, dur, scroll, human, ref, device, country, city, is_new, reg FROM tw_hits WHERE ts > ? ${bots ? '' : 'AND human = 1'} ORDER BY vid, ts LIMIT ${LIMIT}`, since),
      q(`SELECT e.hid, e.name, e.detail FROM tw_events e JOIN tw_hits h ON h.hid = e.hid WHERE e.ts > ? ${bots ? '' : 'AND h.human = 1'} LIMIT 20000`, since),
      q(`SELECT COUNT(*) hits, COUNT(DISTINCT vid) vis, SUM(human = 1) human_hits, COUNT(DISTINCT CASE WHEN human = 1 THEN vid END) human_vis, SUM(dur > 0) with_time FROM tw_hits WHERE ts > ?`, since),
    ]);
    const hits = hitsRes.results || [], events = evRes.results || [], qr = (qualRes.results || [])[0] || {};
    const evByHid = {};
    for (const e of events) (evByHid[e.hid] = evByHid[e.hid] || []).push(e);

    // Armar visitas (misma regla que el resto del panel: corte a 30 min).
    const visits = []; let cur = null;
    for (const h of hits) {
      if (!cur || cur.vid !== h.vid || h.ts - cur.lastTs > GAP) { cur = { vid: h.vid, start: h.ts, lastTs: h.ts, end: h.ts + Math.max(0, h.dur || 0) * 1000, pages: [], ref: h.ref || '', device: h.device, country: h.country, city: h.city, isNew: !!h.is_new, reg: !!h.reg, events: [] }; visits.push(cur); }
      cur.lastTs = h.ts; cur.end = Math.max(cur.end, h.ts + Math.max(0, h.dur || 0) * 1000);
      cur.pages.push({ path: h.path, dur: h.dur || 0, scroll: h.scroll || 0, ts: h.ts });
      for (const e of evByHid[h.hid] || []) cur.events.push(e.name + (e.detail ? ':' + e.detail : ''));
    }
    for (const v of visits) v.secs = Math.round((v.end - v.start) / 1000);
    const sum = (v) => v.pages.reduce((a, pg) => a + pg.dur, 0);
    for (const v of visits) v.active = sum(v); // tiempo activo real (pestaña visible), sin solapes

    // 1) Distribución del tiempo activo por visita (incluye las de 0 s: nadie queda fuera del cálculo).
    const dist = BUCKETS.map(([label, lo, hi]) => ({ label, n: visits.filter(v => v.active >= lo && v.active <= hi).length }));
    const withTime = visits.filter(v => v.active > 0).map(v => v.active);
    const allActive = visits.map(v => v.active);
    const summary = {
      visits: visits.length, uniq: new Set(visits.map(v => v.vid)).size,
      medAll: med(allActive), medWithTime: med(withTime), avgWithTime: avg(withTime),
      over60: pct(visits.filter(v => v.active >= 60).length, visits.length), over180: pct(visits.filter(v => v.active >= 180).length, visits.length),
      pagesPerVisit: visits.length ? Math.round(10 * hits.length / visits.length) / 10 : 0,
      multi: pct(visits.filter(v => v.pages.length > 1).length, visits.length),
      bounce: pct(visits.filter(v => v.pages.length === 1).length, visits.length),
    };

    // 2) Tabla por página: entradas, salidas, tiempo, scroll, conversión.
    const pg = {};
    for (const v of visits) {
      v.pages.forEach((x, i) => {
        const r = pg[x.path] = pg[x.path] || { path: x.path, views: 0, vis: new Set(), entries: 0, exits: 0, bounces: 0, durs: [], scrolls: [], conv: 0 };
        r.views++; r.vis.add(v.vid); if (x.dur > 0) r.durs.push(x.dur); r.scrolls.push(x.scroll);
        if (i === 0) { r.entries++; if (v.pages.length === 1) r.bounces++; }
        if (i === v.pages.length - 1) r.exits++;
      });
    }
    const CONV = /^(pay_open|unlock_click|signup_done|nov_signup|nov_join|follow)/;
    for (const h of hits) { const r = pg[h.path]; if (r) for (const e of evByHid[h.hid] || []) if (CONV.test(e.name)) r.conv++; }
    const pages = Object.values(pg).sort((a, b) => b.views - a.views).slice(0, 40).map(r => ({
      path: r.path, views: r.views, uniq: r.vis.size, entries: r.entries, exitPct: pct(r.exits, r.views), bouncePct: pct(r.bounces, r.entries),
      medDur: med(r.durs), avgDur: avg(r.durs), noSignalPct: pct(r.views - r.durs.length, r.views), scroll: avg(r.scrolls), conv: r.conv,
    }));

    // 3) Recorridos: primera página -> segunda página, y páginas de salida.
    const flows = {};
    for (const v of visits) if (v.pages.length > 1) { const k = v.pages[0].path + ' → ' + v.pages[1].path; flows[k] = (flows[k] || 0) + 1; }
    const topFlows = Object.entries(flows).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => ({ flow: k, n }));

    // 4) Orígenes y dispositivos: ¿quién se queda más y quién convierte?
    const group = (fn) => {
      const g = {};
      for (const v of visits) { const k = fn(v) || 'Directo / sin dato'; const r = g[k] = g[k] || { k, n: 0, act: [], over60: 0, conv: 0, multi: 0 }; r.n++; r.act.push(v.active); if (v.active >= 60) r.over60++; if (v.pages.length > 1) r.multi++; if (v.events.some(e => CONV.test(e))) r.conv++; }
      return Object.values(g).sort((a, b) => b.n - a.n).slice(0, 12).map(r => ({ k: r.k, visits: r.n, medActive: med(r.act), over60: pct(r.over60, r.n), multi: pct(r.multi, r.n), conv: pct(r.conv, r.n) }));
    };
    const bySource = group(v => v.ref), byDevice = group(v => v.device), byCountry = group(v => v.country).slice(0, 10);

    // 5) Embudo de intención (visitantes distintos, no eventos).
    const hasEv = (re) => visits.filter(v => v.events.some(e => re.test(e))).length;
    const n = visits.length;
    const funnel = [
      ['Visitas', n], ['Vieron 2 páginas o más', visits.filter(v => v.pages.length > 1).length], ['Se quedaron 1 min o más', visits.filter(v => v.active >= 60).length],
      ['Tocaron un video (Novinhas)', hasEv(/^nov_watch/)], ['Reprodujeron un video', hasEv(/^nov_play/)], ['Tocaron un candado / desbloqueo', hasEv(/^unlock_click/)],
      ['Abrieron el pago', hasEv(/^pay_open/)], ['Se registraron', hasEv(/^(signup_done|nov_signup)/)],
    ].map(([label, c]) => ({ label, n: c, pct: pct(c, n) }));

    // 6) Últimas visitas con recorrido completo (qué hizo cada persona, en orden).
    const recent = visits.slice().sort((a, b) => b.start - a.start).slice(0, 40).map(v => ({
      ts: v.start, country: v.country, city: v.city, device: v.device, ref: v.ref || '', isNew: v.isNew, reg: v.reg, active: v.active, secs: v.secs,
      pages: v.pages.slice(0, 12).map(x => ({ path: x.path, dur: x.dur, scroll: x.scroll })), events: v.events.slice(0, 10),
    }));

    const body = {
      ok: true, days, bots, truncated: hits.length >= LIMIT,
      quality: { hits: qr.hits || 0, humanHits: qr.human_hits || 0, humanVisitors: qr.human_vis || 0, allVisitors: qr.vis || 0, withTime: qr.with_time || 0 },
      summary, dist, pages, topFlows, bySource, byDevice, byCountry, funnel, recent,
    };
    cache.set(key, { t: now, body }); if (cache.size > 12) cache.delete(cache.keys().next().value);
    return json(body, 200, '', { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    return json({ ok: false, error: 'behavior_unavailable', detail: String(error?.message || error) }, 500);
  }
}
