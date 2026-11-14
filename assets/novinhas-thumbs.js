/* Tarjetas de canal: reemplaza la miniatura fija por el preview de ~20 s elegido por el dueño
   ("Add to home preview queue"). Si eligió varios en un canal, rotan 1 por hora.
   El clip se reproduce solo (mudo, en loop) mientras la tarjeta está a la vista. */
(function () {
  var cards = [].slice.call(document.querySelectorAll('a.nov-channel-card[href*="/novinhas/canal/?c="]')); if (!cards.length) return;
  fetch('/api/novinhas/featured?thumbs=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.thumbs) return;
    var vids = [];
    cards.forEach(function (a) {
      var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')), t = m && d.thumbs[decodeURIComponent(m[1])], img = a.querySelector('img'); if (!t || !img) return;
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.src = t.src;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.style.cssText = 'width:82px;height:112px;min-width:82px;min-height:112px;max-width:82px;max-height:112px;object-fit:cover;flex:none;border-radius:9px;background:#000;pointer-events:none;cursor:pointer';
      img.style.display = 'none';
      v.addEventListener('error', function () { img.style.display = ''; if (v.parentNode) v.parentNode.removeChild(v); });
      img.parentNode.insertBefore(v, img);
      vids.push(v);
    });
    if (!vids.length) return;
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) e.target.play().catch(function () {}); else e.target.pause(); });
      }, { rootMargin: '140px' });
      vids.forEach(function (v) { io.observe(v); });
    } else vids.forEach(function (v) { v.play().catch(function () {}); });
  }).catch(function () {});
})();
