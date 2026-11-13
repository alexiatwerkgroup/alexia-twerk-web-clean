/* Home: fila de previews de Novinhas (reemplaza el boton Enter the Vault). Estaticos con poster; se mueven solo al pasar el mouse. Cada tarjeta lleva al CANAL. */
(function () {
  var box = document.getElementById('nov-feat'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('/api/novinhas/featured?row=16', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.items || !d.items.length) return;
    box.innerHTML = '<div class="nf-row">' + d.items.slice(0, 8).map(function (it) {
      return '<a class="nf-it" href="' + esc(it.url) + '" aria-label="' + esc(it.name) + '"><span class="nf-m"><img alt="" loading="lazy" src="' + esc(it.poster) + '"><video muted loop playsinline preload="none" data-src="' + esc(it.src) + '"></video></span>' +
        '<span class="nf-t"><span class="nf-l1">Deleted from <img class="nf-yt" alt="YouTube" src="/assets/yt-logo.png"></span><span class="nf-l2"><b>' + esc(it.name) + '</b>' + (it.total ? ' · ' + it.total + ' videos' : '') + '</span></span></a>';
    }).join('') + '</div>';
    [].forEach.call(box.querySelectorAll('.nf-it'), function (a) {
      var v = a.querySelector('video');
      a.addEventListener('mouseenter', function () { if (!v.src) v.src = v.getAttribute('data-src'); v.classList.add('on'); v.play().catch(function () {}); });
      a.addEventListener('mouseleave', function () { v.pause(); v.classList.remove('on'); try { v.currentTime = 0; } catch (_) {} });
    });
  }).catch(function () {});
})();
