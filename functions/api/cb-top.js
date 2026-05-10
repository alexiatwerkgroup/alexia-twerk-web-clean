import { logger } from '../../_lib/logger.js'

const AFF_CODE = 'Re5nr'
const API_URL = 'https://chaturbate.com/affiliates/api/onlinerooms/?wm=' + AFF_CODE + '&format=json&limit=40&gender=f&order_by=-num_users&hd=true'

export async function onRequest(context) {
  try {
    logger.debug('cb-top', 'Fetching from Chaturbate API')
    const upstream = await fetch(API_URL, {
      headers: {
        'User-Agent': 'twerkhub.alexiatwerkgroup.com cb-promo proxy',
        'Accept': 'application/json',
      },
      cf: { cacheTtl: 60, cacheEverything: true },
    })

    if (!upstream.ok) {
      logger.warn('cb-top', 'Upstream error', { status: upstream.status })
      return new Response(
        JSON.stringify({ error: 'upstream_error', status: upstream.status }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const rooms = await upstream.json()
    const usable = (Array.isArray(rooms) ? rooms : []).filter(function (r) {
      const cBlock = (r.block_from_countries || '').toString().trim()
      const sBlock = (r.block_from_states || '').toString().trim()
      const noCBlock = !cBlock || cBlock === 'null' || cBlock === '[]'
      const noSBlock = !sBlock || sBlock === 'null' || sBlock === '[]'
      return noCBlock && noSBlock && r.is_hd
    })

    const slim = usable.slice(0, 15).map(function (r) {
      return {
        username: r.username,
        display_name: r.display_name || r.username,
        num_users: r.num_users || 0,
        country: r.country || '',
        tags: Array.isArray(r.tags) ? r.tags.slice(0, 3) : [],
        is_hd: !!r.is_hd,
        image_url: r.image_url || r.image_url_360x270 || '',
        chat_room_url: r.chat_room_url_revshare || ('https://chaturbate.com/in/?tour=LQps&campaign=' + AFF_CODE + '&track=default&room=' + r.username),
        iframe_url: 'https://chaturbate.com/in/?tour=Jrvi&campaign=' + AFF_CODE + '&track=embed&room=' + r.username + '&bgcolor=black&disable_sound=1',
      }
    })

    logger.info('cb-top', 'Rooms fetched', { count: slim.length })
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
    )
  } catch (err) {
    logger.error('cb-top', 'Fetch failed', { error: String(err && err.message || err) })
    return new Response(
      JSON.stringify({ error: 'fetch_failed', message: String(err && err.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
