import { verifyTurnstile } from './_lib/turnstile.js';
import { authAbuseResponse } from './_lib/auth-abuse.js';
import { explicitPauseResponse } from './_lib/jenny-pause.js';
// TWERKHUB · global middleware for every HTML page (existing and future), one implementation:
//  1) adults-only disclaimer at the end of <body>
//  2) first-party visit tracking (anonymous visitor cookie, country from Cloudflare, no IP stored)
//  3) tracker + owner-only counter scripts
import { authenticate } from './_lib/auth.js';
import { init, parseUA, isBot, cookie, OWNER } from './_lib/analytics.js';
const DISC = '<div class="twk-disc" role="note" style="margin:0;padding:18px 16px;border-top:1px solid rgba(255,255,255,.12);background:#000;color:#9d9db0;font:11px/1.6 system-ui,Arial,sans-serif;text-align:center;letter-spacing:.02em"><b style="color:#fff">18+ ADULTS ONLY.</b> If you are under 18 you cannot enter this site. All performers in Twerkhub original content are 18 or older and appear under a written agreement.</div>';

export async function onRequest(context) {
  const paused = await explicitPauseResponse(context.request);
  if (paused) return paused;
  const limited = await authAbuseResponse(context);
  if (limited) return limited;
  const authPath = new URL(context.request.url).pathname.replace(/\/+$/, '');
  if (context.request.method === 'POST' && ['/api/auth/signin', '/api/auth/signup'].includes(authPath)) {
    let body; try { body = await context.request.clone().json(); } catch { body = {}; }
    const challenge = await verifyTurnstile(context.request, context.env, body.turnstileToken, authPath.endsWith('/signup') ? 'signup' : 'signin');
    if (challenge) return challenge;
  }
  let res = await context.next();
  if (context.authQuota) {
    const headers = new Headers(res.headers);
    headers.set('X-RateLimit-Limit', String(context.authQuota.limit));
    headers.set('X-RateLimit-Remaining', String(context.authQuota.remaining));
    headers.set('X-RateLimit-Reset', String(context.authQuota.reset));
    res = new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  let spare = null;
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const ct = res.headers.get('content-type') || '';
    if (request.method !== 'GET' || url.pathname.startsWith('/api/') || !ct.includes('text/html') || !res.body || res.status !== 200) return res;
    try { spare = res.clone(); } catch (e) {}
    const html = (await res.text()).replace(/supabase-config\.js(?:\?[^"'<>\s]*)?/g, 'supabase-config.js?v=20261103-confirm').replace(/twerkhub-auth\.js(?:\?[^"'<>\s]*)?/g, 'twerkhub-auth.js?v=20261103-confirm').replace(/twk-stats-btn\.js(?:\?[^"'<>\s]*)?/g, 'twk-stats-btn.js?v=20261105-single-card');
    const ua = request.headers.get('user-agent') || '';
    const track = env.DB && !isBot(ua) && cookie(request, 'twx') !== '1' && !url.pathname.startsWith('/admin/');
    let add = html.includes('class="twk-disc"') ? '' : DISC;
    const h = new Headers(res.headers);
    if (track) {
      let vid = cookie(request, 'twv'); const isNew = vid ? 0 : 1;
      if (!vid) { vid = crypto.randomUUID(); h.append('Set-Cookie', 'twv=' + vid + '; Max-Age=63072000; Path=/; SameSite=Lax; Secure'); }
      const hid = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const cf = request.cf || {};
      let reg = 0, owner = false, uid = null; try { const p = await authenticate(request, env); reg = p && p.sub ? 1 : 0; uid = reg ? String(p.sub) : null; if (reg) { const u = await env.DB.prepare('SELECT email FROM profiles WHERE id = ?').bind(p.sub).first(); owner = !!u && String(u.email).toLowerCase() === OWNER; } } catch (e) {}
      let ref = ''; try { const r = request.headers.get('referer'); if (r) { const rh = new URL(r).hostname.replace(/^www\./, ''); if (rh !== url.hostname.replace(/^www\./, '')) ref = rh; } } catch (e) {}
      const utm = url.searchParams.get('utm_source'); if (utm) ref = (ref ? ref + ' · ' : '') + 'utm:' + utm.slice(0, 30);
      const u = parseUA(ua), lang = (request.headers.get('accept-language') || '').split(',')[0].slice(0, 10);
      context.waitUntil((async () => {
        if (owner) return; try { await init(env.DB); const seenAt = Date.now(); await env.DB.prepare('INSERT INTO tw_hits (hid, ts, last_active, vid, path, country, region, city, tz, device, browser, os, lang, ref, is_new, reg, lat, lon, uid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(hid, seenAt, seenAt, vid, url.pathname.slice(0, 200), cf.country || '', cf.region || '', cf.city || '', cf.timezone || '', u.device, u.browser, u.os, lang, ref, isNew, reg, cf.latitude ? Math.round(cf.latitude * 10) / 10 : null, cf.longitude ? Math.round(cf.longitude * 10) / 10 : null, uid).run(); } catch (e) {}
      })());
      add += '<script>window.__twh="' + hid + '"</script><script src="/assets/twerkhub-track.js?v=3" defer></script>';
    }
    add += '<script src="/assets/twerkhub-counter.js?v=20261105-owner-auth" defer></script>';
    add += '<script>(function(){document.querySelectorAll(".tn2-lk a,.tn2 details nav a,.tf2 a").forEach(function(a){var h=a.getAttribute("href")||"";if(h.indexOf("/membership")===0||h.indexOf("/pt/membership")===0){a.href="/tokens/";a.textContent="BALANCE"}})})();</script>';
    if (!html.includes('/assets/twk-stats-btn.js')) add += '<script src="/assets/twk-stats-btn.js?v=20261105-single-card" defer></script>';
    const i = html.lastIndexOf('</body>');
    const out = i >= 0 ? html.slice(0, i) + add + html.slice(i) : html + add;
    h.delete('content-length'); h.delete('content-encoding'); h.delete('etag');
    return new Response(out, { status: res.status, statusText: res.statusText, headers: h });
  } catch (e) {
    return spare || res;
  }
}
