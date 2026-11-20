/* Keep live channel cards aligned with the public visit ranking. */
(function () {
  var grid = document.querySelector('.nov-featured-grid');
  if (!grid) return;
  var running = false;
  function sortCards() {
    if (running) return;
    running = true;
    fetch('/api/novinhas/rankings?order=1')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.order || !d.order.length) return;
        var views = {}; d.order.forEach(function (x) { views[x.slug] = x.views; });
        var cards = [].slice.call(grid.querySelectorAll('a.nov-channel-live[href*="/novinhas/canal/?c="]'));
        var sorted = cards.map(function (a, i) {
          var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')), slug = m ? decodeURIComponent(m[1]) : '';
          return { a: a, wrap: a.closest('.nov-thumb-admin-wrap') || a, i: i, v: views[slug] || 0 };
        }).sort(function (x, y) { return (y.v - x.v) || (x.i - y.i); });
        window.__novOrderedOnce = true;
        // Only touch the DOM if the order really changed (moving 100+ nodes forces re-layout and reloads).
        if (sorted.every(function (x, k) { return x.i === k; })) return;
        var frag = document.createDocumentFragment();
        sorted.forEach(function (x) { frag.appendChild(x.wrap); });
        grid.appendChild(frag);
      })
      .catch(function () {})
      .finally(function () { running = false; });
  }
  sortCards();
  document.addEventListener('novinhas:channels-updated', sortCards);
})();
