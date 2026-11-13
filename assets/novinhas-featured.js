/* Home: preview destacado de Novinhas (reemplaza el boton Enter the Vault). Fallback: el boton original. */
(function () {
  var box = document.getElementById('nov-feat'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('/api/novinhas/featured', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || d.none || !d.src) return;
    var n = d.viewers | 0;
    var fomo = n >= 1 ? 'Right now at least ' + n + (n === 1 ? ' user is' : ' users are') + ' in this channel' : 'New videos added to this channel all the time';
    var top = n >= 1 ? '<b>' + n + '</b> ' + (n === 1 ? 'person is' : 'people are') + ' watching this channel right now' : 'New drops added to this channel every day';
    box.innerHTML = '<div class="nf-card"><div class="nf-top"><i></i><span>' + top + '</span><em>LIVE</em></div>' +
      '<a class="nf-media" href="' + esc(d.url) + '" aria-label="Watch ' + esc(d.name) + '"><video muted playsinline preload="metadata" poster="' + esc(d.poster) + '"></video></a>' +
      '<div class="nf-foot"><div class="nf-hook">Deleted from YouTube. <b>Only here.</b> Don\'t miss the full video before it\'s gone.</div>' +
      '<div class="nf-meta"><span>' + esc(d.name) + '</span><div>20s preview</div></div>' +
      '<div class="nf-act"><a class="gold" href="' + esc(d.url) + '">Watch the full video <svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg></a></div></div></div>';
    var v = box.querySelector('video'); v.muted = true; v.src = d.src; var st = d.start || 0, en = st + (d.secs || 20);
    v.addEventListener('loadedmetadata', function () { if (st) { try { v.currentTime = st; } catch (_) {} } });
    v.addEventListener('timeupdate', function () { if (v.currentTime >= en || v.currentTime < st - 0.5) { try { v.currentTime = st; } catch (_) {} } });
    v.addEventListener('ended', function () { try { v.currentTime = st; v.play().catch(function () {}); } catch (_) {} });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); }); }, { threshold: 0.35 }).observe(v); else v.play().catch(function () {});
  }).catch(function () {});
})();
