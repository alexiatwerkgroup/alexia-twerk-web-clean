import { validModelN, videoKey, catalogStorage } from '../../../_lib/catalog.js';

// Tainara's full originals stay private in R2. This endpoint exposes only the
// first ten seconds as a byte-limited preview, matching Abbi's public preview.
const TAINARA_SECONDS = {"01":6.465,"02":14.64,"03":33.659,"04":2.628,"05":59.726,"06":7.466,"07":14.64,"08":59.56,"09":456.206,"10":34.785,"11":59.726,"12":146.229,"13":89.59,"14":10.469,"15":45.17,"16":59.601,"17":57.933,"18":110.736,"19":25.484,"20":59.56,"21":100.767,"22":59.685,"23":101.101,"24":80.58,"25":94.886,"26":17.1,"27":89.756,"28":8.884,"29":59.601,"30":89.464,"31":59.56,"32":16.141,"33":15.098,"34":14.556,"35":59.601,"36":89.715,"37":59.643,"38":93.135,"39":79.079,"40":29.78,"41":79.705,"42":14.723,"43":59.685,"44":86.503,"45":38.622,"46":15.015,"47":101.56,"48":60.269,"49":59.726,"50":608.066,"51":92.509,"52":59.726,"53":14.723,"54":45.754,"55":138.138,"56":59.434,"57":89.715,"58":201.91,"59":50.801,"60":29.696,"61":23.232,"62":178.72,"63":59.768,"64":170.504,"65":15.098,"66":59.726,"67":48.924,"68":15.057,"69":8.467,"70":31.907,"71":152.027,"72":96.888,"73":42.042,"74":22.773,"75":51.51,"76":239.072,"77":40.165,"78":95.512,"79":49.967,"80":67.693,"81":60.018,"82":121.204,"83":70.362,"84":142.684,"85":60.31,"86":14.64,"87":14.598,"88":59.685,"89":60.018,"90":194.986,"91":88.63,"92":59.726,"93":256.548,"94":59.768,"95":172.464,"96":93.719};

const error = (status, body) => new Response(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestGet({ request, env, params }) {
  if (String(params.slug || '').toLowerCase() !== 'tainara') return error(404, 'not_found');
  const n = new URL(request.url).searchParams.get('n') || '';
  if (!validModelN('tainara', n) || !TAINARA_SECONDS[n]) return error(400, 'bad_request');
  const storage = catalogStorage(env, 'tainara');
  if (!storage) return error(503, 'not_configured');
  const key = videoKey('tainara', n);
  const head = await storage.head(key);
  if (!head?.size) return error(404, 'not_found');

  const duration = TAINARA_SECONDS[n];
  const previewSeconds = duration > 10 ? 10 : Math.max(1, duration * 0.1);
  const allowedEnd = Math.max(0, Math.floor(head.size * previewSeconds / duration) - 1);
  const range = request.headers.get('Range');
  let start = 0, end = head.size - 1;
  const match = range && /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match) {
    if (match[1] === '') start = Math.max(0, head.size - parseInt(match[2], 10));
    else start = parseInt(match[1], 10);
    if (match[2] && match[1]) end = Math.min(end, parseInt(match[2], 10));
  }
  if (start > allowedEnd || start >= head.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } });
  end = Math.min(end, allowedEnd);
  const obj = await storage.get(key, { range: { offset: start, length: end - start + 1 } });
  return new Response(obj.body, { status: 206, headers: {
    'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1),
    'Content-Range': `bytes ${start}-${end}/${head.size}`, 'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex', 'X-Preview-Duration': String(previewSeconds)
  }});
}
