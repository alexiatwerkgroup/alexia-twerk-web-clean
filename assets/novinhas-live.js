(function () {
  var grid = document.querySelector('.nov-featured-grid');
  if (!grid) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function channelCard(c) {
    var slug = String(c.slug || ''), name = String(c.name || slug), total = Number(c.total) || 0;
    var a = el('a', 'nov-channel-card nov-channel-live');
    a.href = '/novinhas/canal/?c=' + encodeURIComponent(slug);
    a.dataset.novAction = 'watch'; a.dataset.novLocation = 'featured';
    var img = el('img'); img.alt = ''; img.loading = 'lazy';
    img.src = c.img || ('/api/novinhas/file?k=' + encodeURIComponent(slug + '/previews/poster-' + String(c.poster || 1).padStart(2, '0') + '.webp'));
    img.addEventListener('error', function () { img.hidden = true; });
    var body = el('div');
    body.append(el('span', 'nov-channel-status', '● WATCH NOW'));
    body.append(el('strong', '', name));
    body.append(el('span', '', total.toLocaleString() + ' videos · Novinhas Archive'));
    body.append(el('b', '', 'Open channel →'));
    a.append(img, body);
    return a;
  }
  function refresh() {
    fetch('/api/novinhas/channels?t=' + Math.floor(Date.now() / 300000), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.channels) || !data.channels.length) return;
        var frag = document.createDocumentFragment();
        data.channels.forEach(function (c) { frag.appendChild(channelCard(c)); });
        grid.replaceChildren(frag);
        var heading = document.querySelector('.nov-featured-sub');
        if (heading) heading.textContent = 'Deleted YouTube & Instagram dancer channels, restored and reorganized here. ' + data.channelsDone + ' channels are live · more are being rebuilt.';
        document.dispatchEvent(new CustomEvent('novinhas:channels-updated', { detail: data }));
      })
      .catch(function () {});
  }
  refresh();
  window.setInterval(refresh, 300000);
})();
