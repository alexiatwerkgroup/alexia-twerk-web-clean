/* Keep live channel cards aligned with the public visit ranking. */
(function () {
  var grid = document.querySelector('.nov-featured-grid');
  if (!grid) return;
  var running = false;
  function sortCards() {
    if (running) return;
    running = true;
    fetch('/api/novinhas/rankings?order=1', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.order || !d.order.length) return;
        var views = {}; d.order.forEach(function (x) { views[x.slug] = x.views; });
        var cards = [].slice.call(grid.querySelectorAll('a.nov-channel-live[href*="/novinhas/canal/?c="]'));
        cards.map(function (a, i) {
          var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')), slug = m ? decodeURIComponent(m[1]) : '';
          return { a: a, wrap: a.closest('.nov-thumb-admin-wrap') || a, i: i, v: views[slug] || 0 };
        }).sort(function (x, y) { return (y.v - x.v) || (x.i - y.i); }).forEach(function (x) { grid.appendChild(x.wrap); });
      })
      .catch(function () {})
      .finally(function () { running = false; });
  }
  sortCards();
  document.addEventListener('novinhas:channels-updated', sortCards);
})();
