/* Tarjetas de canal: en vez de la miniatura fija, muestra 1 de los previews elegidos en ese canal (rota al azar 1 por dia). Se mueve solo al pasar el mouse. */
(function () {
  var cards = [].slice.call(document.querySelectorAll('a.nov-channel-card[href*="/novinhas/canal/?c="]')); if (!cards.length) return;
  fetch('/api/novinhas/featured?thumbs=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.thumbs) return;
    cards.forEach(function (a) {
      var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')), t = m && d.thumbs[decodeURIComponent(m[1])], img = a.querySelector('img'); if (!t || !img) return;
      var cs = getComputedStyle(img), v = document.createElement('video');
      v.className = img.className; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.src = t.src + '#t=6';
      v.style.cssText = 'width:' + cs.width + ';height:' + cs.height + ';object-fit:cover;flex:none;border-radius:' + cs.borderRadius + ';background:#000;display:none';
      v.addEventListener('loadeddata', function () { try { v.currentTime = 6; } catch (_) {} v.style.display = ''; img.style.display = 'none'; });
      img.parentNode.insertBefore(v, img);
      a.addEventListener('mouseenter', function () { v.play().catch(function () {}); });
      a.addEventListener('mouseleave', function () { v.pause(); try { v.currentTime = 6; } catch (_) {} });
    });
  }).catch(function () {});
})();
