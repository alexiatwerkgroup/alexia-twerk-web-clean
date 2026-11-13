// POST /api/novinhas/activate {code}  -> si la palabra clave es valida, deja la cookie VIP por 30 dias.
import { codesCfg, sha256hex, cookieFor, ensureCodes } from '../../_lib/vip.js';
export async function onRequestPost({ request, env }) {
  const json = (o, s, extra) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extra || {}) } });
  if (!env.NOVINHAS_VIDEOS) return json({ ok: false }, 500);
  let code = ''; try { code = String((await request.json()).code || ''); } catch (e) {}
  code = code.trim().toLowerCase(); const cc = await codesCfg(env);
  await new Promise((r) => setTimeout(r, 350));
  if (!code || code.length > 80 || !cc || !cc.key) return json({ ok: false }, 401);
  if ((cc.codes || []).includes(await sha256hex(code))) return json({ ok: true }, 200, { 'Set-Cookie': await cookieFor(env) });
  // codigo individual (D1): vale hasta su vencimiento y en un maximo de dispositivos
  if (env.DB) {
    try {
      await ensureCodes(env.DB);
      const r = await env.DB.prepare('SELECT exp, revoked FROM nv_codes WHERE code = ?').bind(code).first();
      if (r && !r.revoked && r.exp > Date.now() / 1000) {
        const ck = request.headers.get('Cookie') || '', dm = /(?:^|;\s*)twk_dev=([0-9a-f]{24})/.exec(ck);
        const dev = dm ? dm[1] : [...crypto.getRandomValues(new Uint8Array(12))].map((x) => x.toString(16).padStart(2, '0')).join('');
        const ip = request.headers.get('CF-Connecting-IP') || '', ua = (request.headers.get('User-Agent') || '').slice(0, 160), now = Math.floor(Date.now() / 1000);
        const devs = (await env.DB.prepare('SELECT DISTINCT dev FROM nv_acts WHERE code = ? AND ok = 1').bind(code).all()).results || [];
        const known = devs.some((d) => d.dev === dev);
        const ipSeen = !!(await env.DB.prepare('SELECT 1 x FROM nv_acts WHERE code = ? AND ok = 1 AND ip = ? LIMIT 1').bind(code, ip).first());
        const allowed = known || devs.length < 4 || (ipSeen && devs.length < 8);
        await env.DB.prepare('INSERT INTO nv_acts (code,dev,ip,ua,ts,ok) VALUES (?,?,?,?,?,?)').bind(code, dev, ip, ua, now, allowed ? 1 : 0).run();
        if (!allowed) {
          const bl = await env.DB.prepare('SELECT COUNT(DISTINCT ip) n FROM nv_acts WHERE code = ? AND ok = 0').bind(code).first();
          if (bl && bl.n >= 3) await env.DB.prepare("UPDATE nv_codes SET revoked = 1, note = 'auto: compartido' WHERE code = ?").bind(code).run();
          return json({ ok: false, error: 'limit' }, 403);
        }
        const cid = (await sha256hex(code)).slice(0, 12);
        await env.DB.prepare('UPDATE nv_codes SET uses = uses + 1, cid = ? WHERE code = ?').bind(cid, code).run();
        const res = json({ ok: true }, 200, { 'Set-Cookie': await cookieFor(env, r.exp, cid) });
        res.headers.append('Set-Cookie', `twk_dev=${dev}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
        return res;
      }
    } catch (e) {}
  }
  return json({ ok: false }, 401);
}
