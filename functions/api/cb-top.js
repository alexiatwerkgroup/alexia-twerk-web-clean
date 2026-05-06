// /functions/api/cb-top.js — Cloudflare Pages Function
// Proxies Chaturbate Affiliate API to bypass CORS. Returns top 10
// live female rooms by viewer count, slimmed for the front-end widget.
// Edge-cached 60s.
//
// File path: functions/api/cb-top.js → URL: /api/cb-top

const AFF_CODE = 'Re5nr';
const API_URL =
  'https://chaturbate.com/affiliates/api/onlinerooms/' +
  '?wm=' + AFF_CODE +
  '&format=json' +
  '&limit=40' +     // pull more so we can filter out blocked rooms
  '&gender=f' +
  '&order_by=-num_users' +
  '&hd=true';

export async function onRequest(context) {
  try {
    const upstream = await fetch(API_URL, {
      headers: {
        'User-Agent': 'twerkhub.alexiatwerkgroup.com cb-promo proxy',
        'Accept': 'application/json',
      },
      cf: { cacheTtl: 60, cacheEverything: true },
    });

    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: 'upstream_error', status: upstream.status }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const rooms = await upstream.json();
    // Filter out rooms with country/state blocks — those show
    // "Esta sala no está disponible en tu región o género" in the iframe.
    // Only keep rooms with NO blocks set (block_from_countries empty + no state blocks).
    const usable = (Array.isArray(rooms) ? rooms : []).filter(function (r) {
      const cBlock = (r.block_from_countries || '').toString().trim();
      const sBlock = (r.block_from_states || '').toString().trim();
      // Empty string or 'null' means no block
      const noCBlock = !cBlock || cBlock === 'null' || cBlock === '[]';
      const noSBlock = !sBlock || sBlock === 'null' || sBlock === '[]';
      return noCBlock && noSBlock && r.is_hd;
    });
    const slim = usable.slice(0, 15).map(function (r) {
      return {
        username: r.username,
        display_name: r.display_name || r.username,
        num_users: r.num_users || 0,
        country: r.country || '',
        tags: Array.isArray(r.tags) ? r.tags.slice(0, 3) : [],
        is_hd: !!r.is_hd,
        image_url: r.image_url || r.image_url_360x270 || '',
        chat_room_url:
          r.chat_room_url_revshare ||
          ('https://chaturbate.com/in/?tour=LQps&campaign=' + AFF_CODE +
           '&track=default&room=' + r.username),
        iframe_url:
          'https://chaturbate.com/in/?tour=Jrvi&campaign=' + AFF_CODE +
          '&track=embed&room=' + r.username +
          '&bgcolor=black&disable_sound=1',
      };
    });

    return new Response(
      JSON.stringify({ rooms: slim, fetched_at: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'fetch_failed', message: String(err && err.message || err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
