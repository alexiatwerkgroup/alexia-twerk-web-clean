import { validModelN, catalogStorage } from '../../../_lib/catalog.js';

const TAINARA_COUNT = 96;
const PREVIEW_SECONDS = {"01":1,"02":10,"03":10,"04":1,"05":10,"06":1,"07":10,"08":10,"09":10,"10":10,"11":10,"12":10,"13":10,"14":10,"15":10,"16":10,"17":10,"18":10,"19":10,"20":10,"21":10,"22":10,"23":10,"24":10,"25":10,"26":10,"27":10,"28":1,"29":10,"30":10,"31":10,"32":10,"33":10,"34":10,"35":10,"36":10,"37":10,"38":10,"39":10,"40":10,"41":10,"42":10,"43":10,"44":10,"45":10,"46":10,"47":10,"48":10,"49":10,"50":10,"51":10,"52":10,"53":10,"54":10,"55":10,"56":10,"57":10,"58":10,"59":10,"60":10,"61":10,"62":10,"63":10,"64":10,"65":10,"66":10,"67":10,"68":10,"69":1,"70":10,"71":10,"72":10,"73":10,"74":10,"75":10,"76":10,"77":10,"78":10,"79":10,"80":10,"81":10,"82":10,"83":10,"84":10,"85":10,"86":10,"87":10,"88":10,"89":10,"90":10,"91":10,"92":10,"93":10,"94":10,"95":10,"96":10};
const error = (status, body) => new Response(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestGet({ request, env, params }) {
  if (String(params.slug || '').toLowerCase() !== 'tainara') return error(404, 'not_found');
  const n = new URL(request.url).searchParams.get('n') || '';
  if (!validModelN('tainara', n) || Number(n) > TAINARA_COUNT) return error(400, 'bad_request');
  const storage = catalogStorage(env, 'tainara');
  if (!storage) return error(503, 'not_configured');
  const key = `preview-v1/tainara/v${n}.mp4`;
  const head = await storage.head(key);
  if (!head?.size) return error(404, 'not_found');

  const range = request.headers.get('Range');
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  let status = 200, start = 0, end = head.size - 1;
  if (match) {
    if (match[1] === '') start = Math.max(0, head.size - parseInt(match[2], 10));
    else start = parseInt(match[1], 10);
    if (match[2] && match[1]) end = Math.min(end, parseInt(match[2], 10));
    if (start > end || start >= head.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } });
    status = 206;
  }
  const length = end - start + 1;
  const obj = await storage.get(key, match ? { range: { offset: start, length } } : undefined);
  return new Response(obj.body, { status, headers: {
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(length),
    ...(match ? { 'Content-Range': `bytes ${start}-${end}/${head.size}` } : {}),
    'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex',
    'X-Preview-Duration': String(PREVIEW_SECONDS[n])
  }});
}
