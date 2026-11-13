// POST /api/novinhas/activate {code}  -> si la palabra clave es valida, deja la cookie VIP por 30 dias.
import { codesCfg, sha256hex, cookieFor } from '../../_lib/vip.js';
export async function onRequestPost({ request, env }) {
  const json = (o, s, extra) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(extra || {}) } });
  if (!env.NOVINHAS_VIDEOS) return json({ ok: false }, 500);
  let code = ''; try { code = String((await request.json()).code || ''); } catch (e) {}
  code = code.trim().toLowerCase(); const cc = await codesCfg(env);
  await new Promise((r) => setTimeout(r, 350));
  if (!code || code.length > 80 || !cc || !cc.key || !(cc.codes || []).includes(await sha256hex(code))) return json({ ok: false }, 401);
  return json({ ok: true }, 200, { 'Set-Cookie': await cookieFor(env) });
}
