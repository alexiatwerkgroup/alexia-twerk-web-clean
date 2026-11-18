/* Ordena las tarjetas de canal de /novinhas/ igual que el ranking (mas visitas primero).
   Los canales sin visitas conservan el orden original, detras de los rankeados. */
(function () {
  var grid = document.querySelector('.nov-featured-grid'); if (!grid) return;
  var cards = [].slice.call(grid.querySelectorAll(':scope > a.nov-channel-live[href*="/novinhas/canal/?c="]')); if (cards.length < 2) return;
  fetch('/api/novinhas/rankings?order=1', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.order || !d.order.length) return;
    var views = {}; d.order.forEach(function (x) { views[x.slug] = x.views; });
    var items = cards.map(function (a, i) {
      var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')), slug = m ? decodeURIComponent(m[1]) : '';
      return { a: a, i: i, v: views[slug] || 0 };
    });
    items.sort(function (x, y) { return (y.v - x.v) || (x.i - y.i); });
    var first = cards[0], anchor = first.previousSibling, frag = document.createDocumentFragment();
    items.forEach(function (it) { frag.appendChild(it.a); });
    grid.insertBefore(frag, anchor ? anchor.nextSibling : grid.firstChild);
  }).catch(function () {});
})();
