// /api/cb-top.js — Vercel serverless function
// Proxy to Chaturbate Affiliate API. Fetches top live female rooms by
// viewer count and returns a slim JSON payload with thumbnails, viewer
// counts, and pre-built affiliate URLs (revshare). Cached at the edge
// for 60 seconds so we don't hammer Chaturbate.

const AFF_CODE = 'Re5nr';
const API_URL =
  'https://chaturbate.com/affiliates/api/onlinerooms/' +
  '?wm=' + AFF_CODE +
  '&format=json' +
  '&limit=10' +
  '&gender=f' +
  '&order_by=-num_users' +
  '&hd=true';

export default async function handler(req, res) {
  try {
    const upstream = await fetch(API_URL, {
      headers: { 'User-Agent': 'twerkhub.alexiatwerkgroup.com cb-promo proxy' },
    });
    if (!upstream.ok) {
      res.status(502).json({ error: 'upstream_error', status: upstream.status });
      return;
    }
    const rooms = await upstream.json();

    // Slim the payload — only keep what the widget needs
    const slim = (Array.isArray(rooms) ? rooms : []).slice(0, 10).map((r) => ({
      username: r.username,
      display_name: r.display_name || r.username,
      num_users: r.num_users || 0,
      country: r.country || '',
      tags: Array.isArray(r.tags) ? r.tags.slice(0, 3) : [],
      is_hd: !!r.is_hd,
      image_url: r.image_url || r.image_url_360x270 || '',
      // Click-out URL with revshare (highest commission) — affiliate code Re5nr
      chat_room_url:
        r.chat_room_url_revshare ||
        ('https://chaturbate.com/in/?tour=LQps&campaign=' +
          AFF_CODE +
          '&track=default&room=' +
          r.username),
      // Iframe-allowed URL (tour=Jrvi) — affiliate code Re5nr
      iframe_url:
        'https://chaturbate.com/in/?tour=Jrvi&campaign=' +
        AFF_CODE +
        '&track=embed&room=' +
        r.username +
        '&bgcolor=black&disable_sound=1',
    }));

    // Edge cache for 60 seconds, revalidate stale-while-revalidate
    res.setHeader(
      'Cache-Control',
      'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
    );
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ rooms: slim, fetched_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'fetch_failed', message: String(err) });
  }
}
