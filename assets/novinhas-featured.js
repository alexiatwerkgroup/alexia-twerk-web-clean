/* Home: fila de previews de Novinhas (reemplaza el boton Enter the Vault). Estaticos con poster; se mueven solo al pasar el mouse. Cada tarjeta lleva al CANAL. */
(function () {
  var box = document.getElementById('nov-feat'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('/api/novinhas/featured?row=8', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.items || !d.items.length) return;
    box.innerHTML = '<div class="nf-head"><span class="nf-hl"></span><span class="nf-hc"><span class="nf-h1">Deleted from <img class="nf-hyt" alt="YouTube" src="/assets/yt-logo.png"></span><span class="nf-h2">Never forgotten</span></span><span class="nf-hl"></span></div><div class="nf-row">' + d.items.slice(0, 8).map(function (it, i) {
      return '<a class="nf-it" href="' + esc(it.url) + '" aria-label="' + esc(it.name) + '"><span class="nf-m"><img alt="" loading="lazy" src="' + esc(it.poster) + '"><video ' + (i === 0 ? 'autoplay ' : '') + 'loop playsinline preload="' + (i === 0 ? 'auto' : 'metadata') + '" data-first="' + (i === 0 ? 1 : 0) + '" data-src="' + esc(it.src) + '"' + (i === 0 ? '' : ' src="' + esc(it.src) + '#t=6"') + '></video></span>' +
        '<span class="nf-t"><span class="nf-l1">Deleted from <img class="nf-yt" alt="YouTube" src="/assets/yt-logo.png"></span><span class="nf-l2"><b>' + esc(it.name) + '</b>' + (it.total ? ' · ' + it.total + ' videos' : '') + '</span></span></a>';
    }).join('') + '</div>';
    [].forEach.call(box.querySelectorAll('.nf-it'), function (a) {
      var v = a.querySelector('video'), m = a.querySelector('.nf-m');
      v.addEventListener('loadedmetadata', function () { if (v.videoWidth && v.videoHeight) m.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight; });
      if (v.getAttribute('data-first') !== '1') v.addEventListener('loadeddata', function () { try { if (v.paused) v.currentTime = 6; } catch (_) {} v.classList.add('on'); });
      if (v.getAttribute('data-first') === '1') {
        v.src = v.getAttribute('data-src'); v.classList.add('on'); v.muted = false; v.volume = 0.4;
        var go = function () { var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); arm(); }); };
        var arm = function () { var ev = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove']; var h = function () { ev.forEach(function (e) { window.removeEventListener(e, h, true); }); v.muted = false; v.play().catch(function () {}); }; ev.forEach(function (e) { window.addEventListener(e, h, true); }); };
        go(); return;
      }
      a.addEventListener('mouseenter', function () { v.muted = true; v.classList.add('on'); v.play().catch(function () {}); });
      a.addEventListener('mouseleave', function () { v.pause(); try { v.currentTime = 6; } catch (_) {} });
    });
  }).catch(function () {});
})();
