/* Animated mini previews for channel cards. Owners can pin up to two previews per channel. */
(function () {
  var grid = document.querySelector('.nov-featured-grid'), processed = new WeakSet();
  if (!grid) return;
  function authHeaders(json) {
    var h = {};
    try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (e) {}
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }
  function slugOf(a) { var m = /[?&]c=([^&]+)/.exec(a.getAttribute('href')); try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; } }
  function wrapCard(a) {
    var parent = a.parentNode, wrap = document.createElement('div');
    wrap.className = 'nov-thumb-admin-wrap';
    wrap.style.cssText = 'min-width:0;width:100%;display:flex;flex-direction:column';
    parent.insertBefore(wrap, a); wrap.appendChild(a); a.style.width = '100%';
    return wrap;
  }
  function addTools(a, slug, item) {
    var wrap = wrapCard(a), bar = document.createElement('div'), count = document.createElement('span'), status = document.createElement('span');
    bar.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 2px 2px';
    count.style.cssText = 'margin-right:auto;color:#ffe9a6;font:800 10px/1.2 system-ui,sans-serif';
    status.style.cssText = 'width:100%;min-height:13px;color:#cdbd9a;font:600 10px/1.2 system-ui,sans-serif';
    var pin = document.createElement('button'), pass = document.createElement('button'), remove = document.createElement('button');
    [[pin, 'Fijar'], [pass, 'Pasar'], [remove, 'Quitar']].forEach(function (x) {
      x[0].type = 'button'; x[0].textContent = x[1];
      x[0].style.cssText = 'padding:5px 9px;border:1px solid #8d6a2d;border-radius:999px;background:#18130d;color:#ffe9a6;font:800 10px/1.2 system-ui,sans-serif;cursor:pointer';
    });
    var choice = item || null, choices = item && item.choices || [], pinned = item && item.pinned || [], video = null;
    var img = a.querySelector('img');
    if (item && item.src && img) {
      video = document.createElement('video'); video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'metadata'; video.src = item.src;
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      video.style.cssText = 'width:82px;height:112px;min-width:82px;min-height:112px;max-width:82px;max-height:112px;object-fit:cover;flex:none;border-radius:9px;background:#000;pointer-events:none';
      img.style.display = 'none';
      video.addEventListener('error', function () { img.style.display = ''; if (video.parentNode) video.parentNode.removeChild(video); });
      img.parentNode.insertBefore(video, img);
    }
    function itemKey(x) { var kind = x.kind || 'preview'; return kind === 'preview' ? 'preview:' + Number(x.id) : kind + ':' + Number(x.id) + ':' + (Number(x.start) || 0) + ':' + (x.slow ? 1 : 0); }
    function contains(x) { return pinned.some(function (p) { return typeof p === 'number' ? (x.kind || 'preview') === 'preview' && Number(p) === Number(x.id) : itemKey(p) === itemKey(x); }); }
    function setChoice(next) {
      choice = next || null;
      if (!video) return;
      if (!choice) { if (video.parentNode) video.parentNode.removeChild(video); if (img) img.style.display = ''; return; }
      if (img) img.style.display = 'none';
      if (!video.parentNode && img && img.parentNode) img.parentNode.insertBefore(video, img);
      video.src = choice.src; video.load();
      if (video.getBoundingClientRect().bottom > 0 && video.getBoundingClientRect().top < window.innerHeight) video.play().catch(function () {});
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
    pin.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (pin.disabled) return; say('Guardando…'); post('pin').then(function (d) { pinned = d.pinned || []; say('Mini clip fijado'); paint(); }).catch(function (err) { say(err.data && err.data.error === 'pin_limit' ? 'Máximo 2 por canal: quitá uno para cambiarlo.' : 'No se pudo fijar.'); paint(); }); };
    pass.onclick = function (e) {
      e.preventDefault(); e.stopPropagation(); if (pass.disabled) return;
      var i = choices.findIndex(function (x) { return choice && Number(x.id) === Number(choice.id); });
      setChoice(choices[(i + 1 + choices.length) % choices.length]);
      say('Mini clip pasado. Los fijados se conservaron.'); paint();
    };
    remove.onclick = function (e) { e.preventDefault(); e.stopPropagation(); if (remove.disabled) return; var removedKey = itemKey(choice); say('Quitando…'); post('hide').then(function (d) { pinned = d.pinned || []; choices = choices.filter(function (x) { return itemKey(x) !== removedKey; }); setChoice(choices.length ? choices[0] : null); say('Mini clip quitado de este canal'); paint(); }).catch(function () { say('No se pudo quitar.'); paint(); }); };
    bar.append(count, pin, pass, remove); wrap.append(bar, status); paint();
  }
  function initializeCards() {
    var cards = [].slice.call(grid.querySelectorAll('a.nov-channel-card[href*="/novinhas/canal/?c="]')).filter(function (a) { return !processed.has(a); });
    if (!cards.length) return;
    cards.forEach(function (a) { processed.add(a); });
    var headers = authHeaders(false);
    fetch('/api/novinhas/featured?thumbs=1&clips=1&n=' + Math.floor(Date.now() / 60000), { credentials: 'same-origin', cache: 'no-store', headers: headers }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.thumbs) return;
    cards.forEach(function (a) {
      var slug = slugOf(a); if (!slug) return;
      var item = d.thumbs[slug] || null, img = a.querySelector('img');
      if (!d.owner) {
        if (!item || !item.src || !img) return;
        var v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'metadata'; v.src = item.src;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
        v.style.cssText = 'width:82px;height:112px;min-width:82px;min-height:112px;max-width:82px;max-height:112px;object-fit:cover;flex:none;border-radius:9px;background:#000;pointer-events:none';
        img.style.display = 'none'; v.addEventListener('error', function () { img.style.display = ''; if (v.parentNode) v.parentNode.removeChild(v); }); img.parentNode.insertBefore(v, img);
        if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); }); }, { rootMargin: '140px' }); io.observe(v); }
        else v.play().catch(function () {});
        return;
      }
      addTools(a, slug, item);
      if (item && item.src && img) {
        var v = a.querySelector('video');
        if (v) {
          v.addEventListener('error', function () { img.style.display = ''; if (v.parentNode) v.parentNode.removeChild(v); });
          if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); }); }, { rootMargin: '140px' }); io.observe(v); }
          else v.play().catch(function () {});
        }
      }
    });
    }).catch(function () {});
  }
  initializeCards();
  new MutationObserver(initializeCards).observe(grid, { childList: true });
})();
