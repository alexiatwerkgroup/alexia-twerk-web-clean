import { getNovinhasLiveIndex } from '../../_lib/novinhas-live-index.js';

export async function onRequestGet({ request, env }) {
  if (!env.NOVINHAS_VIDEOS) return new Response(JSON.stringify({ channels: [], channelsDone: 0, videosDone: 0 }), { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  try {
    const data = await getNovinhasLiveIndex(request, env);
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300', 'X-Robots-Tag': 'noindex' } });
  } catch {
    return new Response(JSON.stringify({ channels: [], channelsDone: 0, videosDone: 0 }), { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
