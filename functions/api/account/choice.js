import { json } from '../../_lib/http.js';
import { init, cookie } from '../../_lib/analytics.js';

export async function onRequestPost({ request, env }) {
  const vid = cookie(request, 'twv');
  if (!vid || !env.DB) return json({ ok: false }, 400);
  let body = {}; try { body = await request.json(); } catch {}
  await init(env.DB);
  const [activity, existing, hit] = await Promise.all([
    env.DB.prepare("SELECT COALESCE(SUM(dur),0) AS seconds, (SELECT COUNT(*) FROM tw_events WHERE vid = ? AND name IN ('nov_video_view','nov_play')) AS videos FROM tw_hits WHERE vid = ? AND human = 1").bind(vid, vid).first(),
    env.DB.prepare("SELECT detail FROM tw_events WHERE vid = ? AND name = 'account_choice' ORDER BY ts DESC LIMIT 1").bind(vid).first(),
    env.DB.prepare('SELECT hid FROM tw_hits WHERE vid = ? ORDER BY ts DESC LIMIT 1').bind(vid).first()
  ]);
  if (Number(activity?.seconds || 0) < 15 * 3600 || Number(activity?.videos || 0) <= 100) return json({ ok: false, error: 'not_eligible' }, 403);
  if (body.action === 'shown') {
    const prior = await env.DB.prepare("SELECT id FROM tw_events WHERE vid = ? AND name = 'account_offer_shown' LIMIT 1").bind(vid).first();
    if (!prior) await env.DB.prepare('INSERT INTO tw_events (ts,hid,vid,name,detail) VALUES (?,?,?,?,?)').bind(Date.now(), hit?.hid || '', vid, 'account_offer_shown', 'eligible').run();
    return json({ ok: true, choice: existing?.detail || null });
  }
  const choice = String(body.choice || '');
  if (!['normal', 'premium'].includes(choice)) return json({ ok: false }, 400);
  if (existing) return json({ ok: true, choice: existing.detail });
  await env.DB.prepare('INSERT INTO tw_events (ts,hid,vid,name,detail) VALUES (?,?,?,?,?)').bind(Date.now(), hit?.hid || '', vid, 'account_choice', choice).run();
  return json({ ok: true, choice });
}
