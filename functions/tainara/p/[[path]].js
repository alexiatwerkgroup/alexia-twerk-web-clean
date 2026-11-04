export async function onRequestGet({ request, env, params }) {
  if (!env.JENNY_VIDEOS) return new Response('not_configured', { status: 500 });
  const raw = Array.isArray(params?.path) ? params.path.join('/') : String(params?.path || '');
  const m = /^v(0[1-9]|[1-9][0-9])\.mp4$/.exec(raw);
  if (!m) return new Response('not_found', { status: 404 });
  const key = `tainara/v${m[1]}.mp4`, head = await env.JENNY_VIDEOS.head(key);
  if (!head) return new Response('not_found', { status: 404 });
  const size = head.size, range = request.headers.get('Range');
  const h = new Headers({'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=3600','Content-Disposition':'inline','X-Content-Type-Options':'nosniff','Content-Length':String(size)});
  let obj = await env.JENNY_VIDEOS.get(key), status = 200;
  const r = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (r) { const start=r[1]?Number(r[1]):Math.max(0,size-Number(r[2])), end=r[2]?Math.min(Number(r[2]),size-1):size-1; if(!Number.isInteger(start)||start<0||start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}}); obj=await env.JENNY_VIDEOS.get(key,{range:{offset:start,length:end-start+1}}); status=206; h.set('Content-Range',`bytes ${start}-${end}/${size}`); h.set('Content-Length',String(end-start+1)); }
  return new Response(obj.body,{status,headers:h});
}
