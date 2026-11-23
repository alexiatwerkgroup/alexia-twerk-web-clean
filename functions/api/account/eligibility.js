import { json } from '../../_lib/http.js';
import { init, cookie } from '../../_lib/analytics.js';

export async function onRequestGet({ request, env }) {
  const vid = cookie(request, 'twv');
  if (!vid || !env.DB) return json({ ok: true, eligible: false });
  await init(env.DB);
  const [activity, selected] = await Promise.all([
    env.DB.prepare("SELECT COALESCE(SUM(dur),0) AS seconds, (SELECT COUNT(*) FROM tw_events WHERE vid = ? AND name IN ('nov_video_view','nov_play')) AS videos FROM tw_hits WHERE vid = ? AND human = 1").bind(vid, vid).first(),
    env.DB.prepare("SELECT detail FROM tw_events WHERE vid = ? AND name = 'account_choice' ORDER BY ts DESC LIMIT 1").bind(vid).first()
  ]);
  const seconds = Number(activity?.seconds || 0), videos = Number(activity?.videos || 0);
  return json({ ok: true, eligible: seconds >= 15 * 3600 && videos > 100, seconds, videos, choice: selected?.detail || null });
}
