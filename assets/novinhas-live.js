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
  function sameText(node, text) { if (node && node.textContent !== text) node.textContent = text; }
  function updateCard(a, c) {
    var kids = a.lastElementChild && a.lastElementChild.children;
    if (!kids || kids.length < 3) return;
    sameText(kids[1], String(c.name || c.slug || ''));
    sameText(kids[2], (Number(c.total) || 0).toLocaleString() + ' videos · Novinhas Archive');
  }
  function slugOfCard(a) { var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href') || ''); try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; } }
  function refresh() {
    fetch('/api/novinhas/channels?t=' + Math.floor(Date.now() / 300000))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.channels) || !data.channels.length) return;
        // Reconcile in place: cards (and their images / mini previews) already on the page are kept,
        // so nothing reloads. Only new channels are added and gone channels removed.
        var existing = {}, changed = false;
        [].slice.call(grid.querySelectorAll('a.nov-channel-live')).forEach(function (a) { existing[slugOfCard(a)] = a; });
        var seen = {}, frag = document.createDocumentFragment();
        data.channels.forEach(function (c) {
          var slug = String(c.slug || ''); seen[slug] = true;
          if (existing[slug]) updateCard(existing[slug], c);
          else { frag.appendChild(channelCard(c)); changed = true; }
        });
        Object.keys(existing).forEach(function (slug) {
          if (seen[slug]) return;
          var a = existing[slug], w = a.closest('.nov-thumb-admin-wrap') || a;
          if (window.TWKNovMotion) a.querySelectorAll('video').forEach(function (v) { window.TWKNovMotion.unwatch(v); });
          w.remove(); changed = true;
        });
        if (frag.childNodes.length) grid.appendChild(frag);
        var heading = document.querySelector('.nov-featured-sub');
        sameText(heading, 'Deleted YouTube & Instagram dancer channels, restored and reorganized here. ' + data.channelsDone + ' channels are live · more are being rebuilt.');
        if (changed || !window.__novOrderedOnce) document.dispatchEvent(new CustomEvent('novinhas:channels-updated', { detail: data }));
      })
      .catch(function () {});
  }
  refresh();
  window.setInterval(refresh, 300000);
})();
