/* Animated mini previews for channel cards. Owners can pin up to two previews per channel. */
(function () {
  if (window.__twkNovThumbsInstalled) return;
  window.__twkNovThumbsInstalled = true;
  var grid = document.querySelector('.nov-featured-grid'), processed = new WeakSet(), queue = [], flushTimer = 0, busy = false;
  if (!grid) return;
  function authHeaders(json) {
    var h = {};
    try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (e) {}
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function slugOf(a) { var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')); try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; } }
  function wrapCard(a) {
    var existing = a.closest('.nov-thumb-admin-wrap'), wrap;
    if (existing && grid.contains(existing)) {
      // Flatten wrappers left by older double initialization; retain one wrapper/card.
      var ancestor = existing.parentElement && existing.parentElement.closest('.nov-thumb-admin-wrap');
      if (ancestor && grid.contains(ancestor)) { ancestor.appendChild(a); existing.remove(); wrap = ancestor; }
      else wrap = existing;
      wrap.querySelectorAll(':scope > .nov-thumb-admin-wrap').forEach(function (nested) { nested.remove(); });
      wrap.querySelectorAll(':scope > div').forEach(function (child) { if (child !== a && child.querySelector('button')) child.remove(); });
      return wrap;
    }
    var parent = a.parentNode; wrap = document.createElement('div');
    wrap.className = 'nov-thumb-admin-wrap';
    wrap.style.cssText = 'min-width:0;width:100%;display:flex;flex-direction:column';
    parent.insertBefore(wrap, a); wrap.appendChild(a); a.style.width = '100%';
    return wrap;
  }
  function addTools(a, slug, item) {
    var oldWrap = a.closest('.nov-thumb-admin-wrap');
    if (a.dataset.novThumbAdminReady === '1' && oldWrap && oldWrap.querySelector(':scope > .nov-thumb-tools')) return;
    a.dataset.novThumbAdminReady = '1';
    var wrap = wrapCard(a), bar = document.createElement('div'), count = document.createElement('span'), status = document.createElement('span');
    bar.className = 'nov-thumb-tools';
    status.className = 'nov-thumb-status';
    bar.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 2px 2px';
    count.style.cssText = 'margin-right:auto;color:#ffe9a6;font:800 10px/1.2 system-ui,sans-serif';
    status.style.cssText = 'width:100%;min-height:13px;color:#cdbd9a;font:600 10px/1.2 system-ui,sans-serif';
    var pin = document.createElement('button'), pass = document.createElement('button'), remove = document.createElement('button');
    [[pin, 'Fijar'], [pass, 'Pasar'], [remove, 'Quitar']].forEach(function (x) {
      x[0].type = 'button'; x[0].textContent = x[1];
      x[0].style.cssText = 'padding:5px 9px;border:1px solid #8d6a2d;border-radius:999px;background:#18130d;color:#ffe9a6;font:800 10px/1.2 system-ui,sans-serif;cursor:pointer';
    });
    var choice = item || null, choices = [], pinned = item && item.pinned || [], seenClipIds = Object.create(null), video = null;
    (item && item.choices || []).forEach(function (x) { var id = String(Number(x.id)); if (!seenClipIds[id]) { seenClipIds[id] = true; choices.push(x); } });
    var img = a.querySelector('img');
    if (item && item.src && img) {
      a.querySelectorAll('video').forEach(function (extra) { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(extra); extra.remove(); });
      video = document.createElement('video'); video.muted = true; video.loop = false; video.playsInline = true; video.preload = 'none'; video.poster = img.currentSrc || img.src; video.src = item.src;
      video.dataset.novThumbPreview = '1';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.style.cssText = 'width:82px;height:112px;min-width:82px;min-height:112px;max-width:82px;max-height:112px;object-fit:cover;flex:none;border-radius:9px;background:#000;pointer-events:none';
      img.style.setProperty('display', 'none', 'important');
      video.addEventListener('error', function () { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(video); img.style.removeProperty('display'); if (video.parentNode) video.parentNode.removeChild(video); });
      img.parentNode.insertBefore(video, img);
    }
    function itemKey(x) { var kind = x.kind || 'preview'; return kind === 'preview' ? 'preview:' + Number(x.id) : kind + ':' + Number(x.id) + ':' + (Number(x.start) || 0) + ':' + (x.slow ? 1 : 0); }
    function contains(x) { return pinned.some(function (p) { return (typeof p === 'number' ? Number(p) : Number(p.id)) === Number(x.id); }); }
    function setChoice(next) {
      choice = next || null;
      if (!video) return;
      if (!choice) { if (video.parentNode) video.parentNode.removeChild(video); if (img) img.style.removeProperty('display'); return; }
      if (img) img.style.setProperty('display', 'none', 'important');
      if (!video.parentNode && img && img.parentNode) img.parentNode.insertBefore(video, img);
      var posterId = String(Number(choice.id)).padStart(2, '0');
      video.poster = '/api/novinhas/file?k=' + encodeURIComponent(slug + '/previews/poster-' + posterId + '.webp');
      video.src = choice.src;
      if (window.TWKNovMotion) window.TWKNovMotion.refresh(video);
    }
    function paint() {
      var isPinned = !!choice && contains(choice), n = pinned.length;
      count.textContent = n + '/2 fijados';
      pin.textContent = isPinned ? 'Fijado' : 'Fijar'; pin.disabled = !choice || isPinned || n >= 2;
      pass.disabled = choices.length < 2; remove.disabled = !choice;
      pin.title = n >= 2 && !isPinned ? 'Quitá uno antes de fijar otro mini clip' : 'Fijar este mini clip en el canal';
      pass.title = 'Pasar al siguiente mini clip disponible'; remove.title = 'Quitar este mini clip de los fijados';
      pin.style.opacity = pin.disabled ? '.55' : '1'; pass.style.opacity = pass.disabled ? '.55' : '1'; remove.style.opacity = remove.disabled ? '.55' : '1';
    }
    function say(text) { status.textContent = text || ''; }
    function post(state) {
      if (!choice) return Promise.resolve(null);
      var headers = authHeaders(true);
      return fetch('/api/novinhas/featured', { method: 'POST', credentials: 'same-origin', headers: headers, body: JSON.stringify({ action: 'thumbset', c: slug, item: Number(choice.id), kind: choice.kind || 'preview', start: Number(choice.start) || 0, slow: choice.slow ? 1 : 0, state: state }) }).then(function (r) {
        return r.json().then(function (d) { if (!r.ok) { var e = new Error(d.error || 'request_failed'); e.data = d; throw e; } return d; });
      });
    }
    pin.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (pin.disabled) return; say('Guardando…'); post('pin').then(function (d) { pinned = d.pinned || []; say('Mini clip fijado'); paint(); }).catch(function (err) { say(err.data && err.data.error === 'pin_limit' ? 'Máximo 2 por canal: quitá uno para cambiarlo.' : err.data && err.data.error === 'duplicate_pin' ? 'Ese video ya está fijado en este canal.' : 'No se pudo fijar.'); paint(); }); };
    pass.onclick = function (e) {
      e.preventDefault(); e.stopPropagation(); if (pass.disabled) return;
      var currentKey = choice && itemKey(choice), i = choices.findIndex(function (x) { return currentKey && itemKey(x) === currentKey; });
      setChoice(choices[(i + 1 + choices.length) % choices.length]);
      say('Mini clip pasado. Los fijados se conservaron.'); paint();
    };
    remove.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (remove.disabled) return; var removedKey = itemKey(choice); say('Quitando…'); post('hide').then(function (d) { pinned = d.pinned || []; choices = choices.filter(function (x) { return itemKey(x) !== removedKey; }); setChoice(choices.length ? choices[0] : null); say('Mini clip quitado de este canal'); paint(); }).catch(function () { say('No se pudo quitar.'); paint(); }); };
    bar.append(count, pin, pass, remove); wrap.append(bar, status); paint();
  }

  // ---- Mini cache (desktop, anonymous visitors): minis are downloaded quietly in the background into the browser's
  // Cache Storage (disk) and played from there on this and later visits. Phones / data saver / logged-in users skip it.
  var MC = (function () {
    var NAME = 'twk-nov-minis-v1', MAX_ENTRIES = 220, TTL = 12 * 3600 * 1000, PARALLEL = 3;
    var conn = navigator.connection || {}, ua = navigator.userAgent || '';
    var desktop = !(window.matchMedia && window.matchMedia('(max-width: 760px)').matches) && !/Mobi|Android|iPhone|iPad/i.test(ua);
    var logged = false; try { logged = !!((JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token); } catch (e) {}
    var ok = !!(window.caches && window.fetch && window.URL && URL.createObjectURL) && desktop && !logged && !conn.saveData && !/(^|-)(2g|3g)$/.test(conn.effectiveType || '');
    var queue = [], queued = Object.create(null), running = 0, urls = Object.create(null), puts = 0, cachePromise = null;
    function open() { return cachePromise || (cachePromise = caches.open(NAME)); }
    function fresh(resp) { var t = Number(resp.headers.get('x-twk-t')) || 0; return t && Date.now() - t < TTL; }
    function blobUrl(src) {
      if (urls[src]) return Promise.resolve(urls[src]);
      return open().then(function (c) { return c.match(src); }).then(function (r) {
        if (!r || !fresh(r)) return null;
        return r.blob().then(function (b) { return (urls[src] = URL.createObjectURL(b)); });
      }).catch(function () { return null; });
    }
    function swap(v, url) {
      function go() { if (v.dataset.novMiniSrc === url) return; v.dataset.novMiniSrc = url; v.src = url; if (window.TWKNovMotion) window.TWKNovMotion.refresh(v); }
      if (v.paused) go(); else v.addEventListener('ended', go, { once: true });
    }
    function prune(c) {
      if (++puts % 10) return;
      c.keys().then(function (ks) { if (ks.length > MAX_ENTRIES) ks.slice(0, ks.length - MAX_ENTRIES).forEach(function (k) { c.delete(k); }); }).catch(function () {});
    }
    function pump() {
      if (document.hidden) return;
      while (running < PARALLEL && queue.length) {
        (function (src) {
          running++;
          open().then(function (c) {
            return c.match(src).then(function (r) {
              if (r && fresh(r)) return;
              return fetch(src, { credentials: 'omit', priority: 'low' }).then(function (resp) {
                var cc = resp.headers.get('cache-control') || '';
                if (resp.status !== 200 || /no-store|private/i.test(cc)) return;
                return resp.blob().then(function (b) {
                  var h = new Headers(resp.headers); h.set('x-twk-t', String(Date.now()));
                  return c.put(src, new Response(b, { status: 200, headers: h })).then(function () { prune(c); });
                });
              });
            });
          }).catch(function () {}).then(function () { running--; setTimeout(pump, 40); });
        })(queue.shift());
      }
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pump(); });
    return {
      on: ok,
      // Called for every mini: play from disk cache if present, and queue a silent download if not.
      use: function (v, src) {
        if (!ok || !src) return;
        blobUrl(src).then(function (u) { if (u && v.isConnected) swap(v, u); });
        if (!queued[src]) { queued[src] = 1; queue.push(src); (window.requestIdleCallback || function (f) { return setTimeout(f, 600); })(pump); }
      }
    };
  })();
  function applyBatch(cards, d) {
    if (!d || !d.thumbs) return;
    cards.forEach(function (a) {
      var slug = slugOf(a); if (!slug) return;
      var item = d.thumbs[slug] || null, img = a.querySelector('img');
      if (!d.owner) {
        if (!item || !item.src || !img) return;
        var existing = a.querySelector('video[data-nov-thumb-preview]');
        if (existing) {
          a.querySelectorAll('video[data-nov-thumb-preview]').forEach(function (extra) { if (extra !== existing) { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(extra); extra.remove(); } });
          if (window.TWKNovMotion && existing.dataset.novMotionWatched !== '1') { existing.dataset.novMotionWatched = '1'; window.TWKNovMotion.watch(existing, -1, false, 1800); }
          MC.use(existing, item.src);
          return;
        }
        var v = document.createElement('video'); v.muted = true; v.loop = false; v.playsInline = true; v.preload = 'none'; v.poster = img.currentSrc || img.src; v.src = item.src;
        v.dataset.novThumbPreview = '1';
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.style.cssText = 'width:82px;height:112px;min-width:82px;min-height:112px;max-width:82px;max-height:112px;object-fit:cover;flex:none;border-radius:9px;background:#000;pointer-events:none';
        img.style.setProperty('display', 'none', 'important'); v.addEventListener('error', function () { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(v); img.style.removeProperty('display'); if (v.parentNode) v.parentNode.removeChild(v); }); img.parentNode.insertBefore(v, img);
        if (window.TWKNovMotion) window.TWKNovMotion.watch(v, -1, false, 1800);
        MC.use(v, item.src);
        return;
      }
      addTools(a, slug, item);
      if (item && item.src && img) {
        var v = a.querySelector('video[data-nov-thumb-preview]');
        if (v && v.dataset.novMotionWatched !== '1') {
          v.dataset.novMotionWatched = '1';
          v.addEventListener('error', function () { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(v); img.style.removeProperty('display'); if (v.parentNode) v.parentNode.removeChild(v); });
          if (window.TWKNovMotion) window.TWKNovMotion.watch(v, -1, false, 1800);
        }
      }
    });
  }
  function scheduleFlush() {
    if (flushTimer || busy || !queue.length) return;
    flushTimer = setTimeout(function () {
      flushTimer = 0; if (busy || !queue.length) return;
      var cards = queue.splice(0, 24), slugs = cards.map(slugOf).filter(Boolean);
      if (!slugs.length) { if (queue.length) scheduleFlush(); return; }
      // Pinned minis rarely change: serve non-owner visitors from a 10-minute local cache.
      var isOwner = !!authHeaders(false).Authorization, cachedThumbs = {}, hit = [], miss = [];
      if (!isOwner) {
        cards.forEach(function (a) {
          var sl = slugOf(a), c = null;
          try { c = JSON.parse(localStorage.getItem('nvThumb:' + sl) || 'null'); } catch (e) {}
          if (c && Date.now() - c.t < 600000) { cachedThumbs[sl] = c.v; hit.push(a); } else miss.push(a);
        });
        if (hit.length) applyBatch(hit, { thumbs: cachedThumbs, owner: false });
        cards = miss; slugs = cards.map(slugOf).filter(Boolean);
        if (!slugs.length) { if (queue.length) scheduleFlush(); return; }
      }
      var url = '/api/novinhas/featured?thumbs=1&clips=1&' + slugs.map(function (s) { return 'c=' + encodeURIComponent(s); }).join('&');
      busy = true;
      fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: authHeaders(false) }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.thumbs && !d.owner) { slugs.forEach(function (sl) { try { localStorage.setItem('nvThumb:' + sl, JSON.stringify({ t: Date.now(), v: d.thumbs[sl] || null })); } catch (e) {} }); }
        if (d && d.thumbs) applyBatch(cards, d);
        else cards.forEach(function (a) { processed.delete(a); if (cardObserver) cardObserver.observe(a); });
      }).catch(function () { cards.forEach(function (a) { processed.delete(a); if (cardObserver) cardObserver.observe(a); }); }).finally(function () { busy = false; if (queue.length) scheduleFlush(); });
    }, 0);
  }
  var cardObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (!e.isIntersecting) return; cardObserver.unobserve(e.target); queue.push(e.target); });
    scheduleFlush();
  }, { rootMargin: '900px 0px', threshold: 0.01 }) : null;
  function initializeCards() {
    var all = [].slice.call(grid.querySelectorAll('a.nov-channel-card[href*="/novinhas/canal/?c="]'));
    all.forEach(function (a) {
      var wraps = []; for (var p = a.parentElement; p && p !== grid; p = p.parentElement) if (p.classList.contains('nov-thumb-admin-wrap')) wraps.push(p);
      var wrap = wraps[wraps.length - 1];
      if (wrap && wraps.length > 1) { wrap.appendChild(a); wraps.slice(0, -1).forEach(function (extra) { if (extra !== wrap && grid.contains(extra)) extra.remove(); }); }
      var host = a.closest('.nov-thumb-admin-wrap') || a;
      var controlRows = Array.prototype.filter.call(host.children, function (el) { return el.tagName === 'DIV' && el.querySelector('button'); });
      controlRows.forEach(function (bar, i) { if (i) bar.remove(); });
      var statuses = host.querySelectorAll(':scope > .nov-thumb-status');
      statuses.forEach(function (status, i) { if (i) status.remove(); });
      var videos = a.querySelectorAll('video');
      videos.forEach(function (v, i) { if (i) { if (window.TWKNovMotion) window.TWKNovMotion.unwatch(v); v.remove(); } });
      var images = a.querySelectorAll('img');
      images.forEach(function (img, i) { if (i) img.remove(); });
    });
    var cards = all.filter(function (a) { return !processed.has(a); });
    cards.forEach(function (a) { processed.add(a); if (cardObserver) cardObserver.observe(a); else queue.push(a); });
    if (!cardObserver) scheduleFlush();
  }
  initializeCards();
  // Desktop: once the page has settled, quietly load the minis of the cards that are still far away so they are cached too.
  function sweepAll() {
    if (!MC.on || !cardObserver) return;
    var rest = [].slice.call(grid.querySelectorAll('a.nov-channel-card[href*="/novinhas/canal/?c="]')).filter(function (a) { return !a.dataset.novSwept && !a.querySelector('video[data-nov-thumb-preview]'); });
    rest.forEach(function (a) { a.dataset.novSwept = '1'; cardObserver.unobserve(a); queue.push(a); });
    scheduleFlush();
  }
  if (MC.on) { if (document.readyState === 'complete') setTimeout(sweepAll, 3000); else window.addEventListener('load', function () { setTimeout(sweepAll, 3000); }); }
  var initQueued = 0;
  new MutationObserver(function () { if (initQueued) return; initQueued = requestAnimationFrame(function () { initQueued = 0; initializeCards(); }); }).observe(grid, { childList: true });
})();
