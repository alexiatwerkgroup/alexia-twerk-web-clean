/* Home: fila de 8 previews de Novinhas. Suenan de a uno, en orden (1ro, 2do, 3ro...), una vez cada uno; el resto del tiempo mudos. Hover = se mueve sin sonido. Cada tarjeta lleva al CANAL. */
(function () {
  var box = document.getElementById('nov-feat'); if (!box) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  fetch('/api/novinhas/featured?row=8', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.items || !d.items.length) return;
    box.innerHTML = '<div class="nf-head"><span class="nf-hl"></span><span class="nf-hc"><span class="nf-h1">Deleted from <img class="nf-hyt" alt="YouTube" src="/assets/yt-logo.png"></span><span class="nf-h2">Never forgotten</span></span><span class="nf-hl"></span></div><div class="nf-row">' + d.items.slice(0, 8).map(function (it) {
      return '<a class="nf-it" href="' + esc(it.url) + '" aria-label="' + esc(it.name) + '"><span class="nf-m"><img alt="" loading="lazy" src="' + esc(it.poster) + '"><video loop="false" playsinline preload="metadata" src="' + esc(it.src) + '#t=6"></video></span>' +
        '<span class="nf-t"><span class="nf-l1">Deleted from <img class="nf-yt" alt="YouTube" src="/assets/yt-logo.png"></span><span class="nf-l2"><b class="nf-nm">' + esc(it.name) + '</b><span class="nf-ct">' + (it.total ? ' · ' + it.total + ' videos' : '') + '</span></span></span></a>';
    }).join('') + '</div>';
    function ownerHdr() { var h = {}; try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (e) {} return h; }
    function ownerState() { return fetch('/api/novinhas/featured?me=1', { credentials: 'same-origin', cache: 'no-store', headers: ownerHdr() }).then(function (r) { return r.ok ? r.json() : null; }); }
    function dot(c) { return '<i style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:-1px;background:' + c + ';box-shadow:0 0 6px ' + c + '"></i>'; }
    fetch('/api/novinhas/featured?me=1', { credentials: 'same-origin', cache: 'no-store', headers: (function () { var h = {}; try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (e) {} return h; })() }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      if (!m || !m.owner) return;
      [].forEach.call(box.querySelectorAll('.nf-it'), function (a, i) {
        var it = d.items[i]; if (!it) return; var key = it.slug + ':' + it.id, m2 = a.querySelector('.nf-m'); if (!m2) return;
        var state = (m.pinned && m.pinned.indexOf(key) >= 0) ? 'pin' : (m.hidden && m.hidden.indexOf(key) >= 0) ? 'hide' : 'free';
        var OPT = [['pin', 'Fijado', '#f0b90b', 8], ['free', 'Al azar', '#33d17a', 42], ['hide', 'Fuera', '#ff3b30', 76]], btns = {};
        function paint() { OPT.forEach(function (o) { var on = o[0] === state; btns[o[0]].innerHTML = (on ? dot(o[2]) : '') + o[1]; btns[o[0]].style.opacity = on ? '1' : '.75'; btns[o[0]].style.borderColor = on ? o[2] : '#b88a2a'; }); a.style.opacity = state === 'hide' ? '.4' : ''; }
        OPT.forEach(function (o) {
          var bt = document.createElement('button'); bt.type = 'button'; bt.setAttribute('aria-label', o[1]);
          bt.style.cssText = 'position:absolute;top:' + o[3] + 'px;left:8px;z-index:5;background:#000c;color:#ffd27a;border:1px solid #b88a2a;border-radius:8px;padding:5px 9px;font:800 11px system-ui;cursor:pointer';
          bt.onclick = function (e) {
            e.preventDefault(); e.stopPropagation(); var h = ownerHdr(); h['Content-Type'] = 'application/json'; var prev = state; bt.textContent = '…';
            fetch('/api/novinhas/featured', { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ action: 'rowset', slug: it.slug, id: it.id, state: o[0] }) }).then(function (r) { state = r.ok ? o[0] : prev; paint(); if (!r.ok) bt.textContent = 'Error'; }).catch(function () { state = prev; paint(); });
          };
          btns[o[0]] = bt; m2.style.position = 'relative'; m2.appendChild(bt);
        });
        paint();
      });
    }).catch(function () {});
    var cards = [].slice.call(box.querySelectorAll('.nf-it')), vids = cards.map(function (a) { return a.querySelector('video'); }), hov = -1, cur = -1, pass = 0, started = false;
    vids.forEach(function (v) { v.loop = false; v.addEventListener('loadeddata', function () { if (v.paused && vids.indexOf(v) !== cur) { try { v.currentTime = 6; } catch (_) {} v.classList.add('on'); } }); });
    function rest(i) { var v = vids[i]; v._q = Date.now(); v.pause(); v.muted = true; try { v.currentTime = 6; } catch (_) {} if (i !== hov) v.classList.add('on'); }
    function play(i) {
      cur = i; var v = vids[i]; v.classList.add('on'); v.volume = 0.4; v.muted = pass > 0;
      try { v.currentTime = 0; } catch (_) {}
      var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); if (pass === 0) arm(); });
    }
    function next() { var i = (cur + 1) % vids.length; if (i === 0) pass++; play(i); }
    var armed = false, off = false;
    function arm() { if (armed) return; armed = true; var ev = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove']; var h = function () { ev.forEach(function (e) { window.removeEventListener(e, h, true); }); if (pass === 0 && cur >= 0) vids[cur].muted = false; }; ev.forEach(function (e) { window.addEventListener(e, h, true); }); }
    vids.forEach(function (v, i) {
      v.addEventListener('ended', function () { if (i === cur) { rest(i); next(); } });
      cards[i].addEventListener('mouseenter', function () { hov = i; if (i === cur) return; if (cur >= 0 && vids[cur]) { vids[cur]._q = Date.now(); vids[cur].pause(); } v.muted = true; v.classList.add('on'); try { v.currentTime = 0; } catch (_) {} v.play().catch(function () {}); });
      cards[i].addEventListener('mouseleave', function () { hov = -1; if (i !== cur) { rest(i); resume(); } });
    });
    /* Si el navegador pausa el preview en curso (ventana/pestana en segundo plano), se reanuda solo: la secuencia y el sonido siguen. */
    vids.forEach(function (v, i) { v.addEventListener('pause', function () { if (Date.now() - (v._q || 0) < 600 || i !== cur || v.ended || hov !== -1 || off) return; setTimeout(function () { if (i === cur && v.paused && !v.ended) v.play().catch(function () {}); }, 150); }); });
    function resume() { if (off || hov !== -1) return; var v = vids[cur]; if (v && v.paused && !v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); }); } }
    var lastT = -1, stall = 0;
    function watchdog() { var v = vids[cur]; if (!v || v.ended || off || hov !== -1) { stall = 0; return; } if (v.currentTime === lastT) { stall++; resume(); if (stall >= 4) { stall = 0; rest(cur); next(); } } else { stall = 0; } lastT = v.currentTime; }
    document.addEventListener('visibilitychange', resume); window.addEventListener('focus', resume); window.addEventListener('blur', function () { setTimeout(resume, 200); });
    setInterval(watchdog, 1500);
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { var now = !es[0].isIntersecting; if (now === off) return; off = now; if (off) { var v = vids[cur]; if (v) { v._q = Date.now(); v.pause(); } } else resume(); }, { threshold: 0.15 }).observe(box); }
    play(0);
  }).catch(function () {});
})();
