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
        var it = d.items[i]; if (!it) return; var b = document.createElement('button'); b.type = 'button'; b.innerHTML = dot('#33d17a') + 'Sacar de la fila'; b.setAttribute('aria-label', 'Sacar este video de la fila');
        b.style.cssText = 'position:absolute;top:8px;left:8px;z-index:5;background:#000c;color:#ffd27a;border:1px solid #b88a2a;border-radius:8px;padding:5px 9px;font:800 11px system-ui;cursor:pointer';
        b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var h = { 'Content-Type': 'application/json' }; try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (x) {} b.innerHTML = dot('#f5b301') + '…'; fetch('/api/novinhas/featured', { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ action: 'rowhide', slug: it.slug, id: it.id }) }).then(function (r) { if (!r.ok) { b.innerHTML = dot('#ff3b30') + 'Error'; return; } return ownerState().then(function (st) { var out = !!(st && st.hidden && st.hidden.indexOf(it.slug + ':' + it.id) >= 0); b.innerHTML = out ? dot('#ff3b30') + 'Fuera de la fila' : dot('#33d17a') + 'Sigue en la fila'; if (out) a.style.opacity = '.4'; }); }); };
        var pb = document.createElement('button'); pb.type = 'button'; pb.textContent = 'Fijar en la fila'; if (m.pinned && m.pinned.indexOf(it.slug + ':' + it.id) >= 0) pb.innerHTML = dot('#f0b90b') + 'Fijado'; pb.style.cssText = 'position:absolute;top:42px;left:8px;z-index:5;background:#000c;color:#ffd27a;border:1px solid #b88a2a;border-radius:8px;padding:5px 9px;font:800 11px system-ui;cursor:pointer';
        pb.onclick = function (e) { e.preventDefault(); e.stopPropagation(); var h = { 'Content-Type': 'application/json' }; try { var t = (JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}).token; if (t) h.Authorization = 'Bearer ' + t; } catch (x) {} pb.textContent = '…'; fetch('/api/novinhas/featured', { method: 'POST', credentials: 'same-origin', headers: h, body: JSON.stringify({ action: 'rowpin', slug: it.slug, id: it.id }) }).then(function (r) { if (!r.ok) { pb.textContent = 'Error'; return; } return ownerState().then(function (st) { var on = !!(st && st.pinned && st.pinned.indexOf(it.slug + ':' + it.id) >= 0); pb.innerHTML = on ? dot('#f0b90b') + 'Fijado' : 'No se fijó'; }); }); };
        var m2 = a.querySelector('.nf-m'); if (m2) { m2.style.position = 'relative'; m2.appendChild(b); m2.appendChild(pb); }
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
    var armed = false;
    function arm() { if (armed) return; armed = true; var ev = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove']; var h = function () { ev.forEach(function (e) { window.removeEventListener(e, h, true); }); if (pass === 0 && cur >= 0) vids[cur].muted = false; }; ev.forEach(function (e) { window.addEventListener(e, h, true); }); }
    vids.forEach(function (v, i) {
      v.addEventListener('ended', function () { if (i === cur) { rest(i); next(); } });
      cards[i].addEventListener('mouseenter', function () { hov = i; if (i === cur) return; v.muted = true; v.classList.add('on'); try { v.currentTime = 0; } catch (_) {} v.play().catch(function () {}); });
      cards[i].addEventListener('mouseleave', function () { hov = -1; if (i !== cur) rest(i); });
    });
    /* Si el navegador pausa el preview en curso (ventana/pestana en segundo plano), se reanuda solo: la secuencia y el sonido siguen. */
    vids.forEach(function (v, i) { v.addEventListener('pause', function () { if (Date.now() - (v._q || 0) < 600 || i !== cur || v.ended || hov === i) return; setTimeout(function () { if (i === cur && v.paused && !v.ended) v.play().catch(function () {}); }, 150); }); });
    function resume() { var v = vids[cur]; if (v && v.paused && !v.ended) { var p = v.play(); if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () {}); }); } }
    var lastT = -1, stall = 0;
    function watchdog() { var v = vids[cur]; if (!v || v.ended || hov === cur) { stall = 0; return; } if (v.currentTime === lastT) { stall++; resume(); if (stall >= 4) { stall = 0; rest(cur); next(); } } else { stall = 0; } lastT = v.currentTime; }
    document.addEventListener('visibilitychange', resume); window.addEventListener('focus', resume); window.addEventListener('blur', function () { setTimeout(resume, 200); });
    setInterval(watchdog, 1500);
    play(0);
  }).catch(function () {});
})();
