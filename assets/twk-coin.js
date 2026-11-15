/* Twerkhub token counter: ONE 3D coin + balance in the nav. Click opens the vault (/tokens/).
   Plays a casino-style coin sound and a burst animation whenever the balance goes up. */
(function () {
  if (window.TwkCoin) return;
  var NSK = 'twk-sound';
  function soundOn() { try { return localStorage.getItem(NSK) !== 'off'; } catch (e) { return true; } }
  var ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { addEventListener(ev, function () { ac(); }, { once: true, passive: true }); });
  function ping(t, f, d, v, type) {
    var c = ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + d * .6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + .02);
  }
  function noise(t, d, v) {
    var c = ctx, n = c.sampleRate * d, b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
    for (var i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(), fl = c.createBiquadFilter();
    fl.type = 'highpass'; fl.frequency.value = 5000; s.buffer = b; g.gain.value = v;
    s.connect(fl); fl.connect(g); g.connect(c.destination); s.start(t);
  }
  // big = more coins + chord. Casino "coins dropping" run + ka-ching.
  var nbuf = null;
  function paper(k) {
    if (!soundOn() || !ac() || ctx.state !== 'running') return;
    try {
      if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t0 = ctx.currentTime, n = 3 + Math.round(Math.random() * 3 * k), i2, t = t0;
      for (i2 = 0; i2 < n; i2++) {
        var src = ctx.createBufferSource(); src.buffer = nbuf;
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200 + Math.random() * 4800; bp.Q.value = .7 + Math.random() * .8;
        var g = ctx.createGain(), pk = (.05 + Math.random() * .05) * k, dc = .03 + Math.random() * .06;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dc);
        src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t, Math.random() * .2, dc + .02);
        t += .018 + Math.random() * .055;
      }
      var r = ctx.createBufferSource(); r.buffer = nbuf; var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      var rg = ctx.createGain(); rg.gain.setValueAtTime(0, t0); rg.gain.linearRampToValueAtTime(.035 * k, t0 + .05); rg.gain.exponentialRampToValueAtTime(.0001, t + .08);
      r.connect(lp); lp.connect(rg); rg.connect(ctx.destination); r.start(t0, 0, t - t0 + .12);
    } catch (e) {}
  }
  function sound(big) {
    if (!soundOn() || !ac() || ctx.state !== 'running') return;
    var t = ctx.currentTime + .02, n = big ? 16 : 9, i;
    for (i = 0; i < n; i++) {
      var tt = t + i * (big ? .055 : .07), f = 1500 + (i % 5) * 160 + i * (big ? 55 : 30);
      ping(tt, f, .16, .07, 'triangle'); ping(tt, f * 2.01, .09, .025, 'sine');
      if (i % 2 === 0) noise(tt, .03, .03);
    }
    var e = t + n * (big ? .055 : .07) + .04;
    [988, 1319, 1760, 2093].forEach(function (f, k) { ping(e + k * .035, f, big ? .9 : .5, .08, 'triangle'); });
    noise(e, .12, .05);
    if (big) { [523, 659, 784, 1046].forEach(function (f, k) { ping(e + .25 + k * .09, f, .7, .06, 'square'); }); }
  }
  function css() {
    if (document.getElementById('twk-coin-css')) return;
    var s = document.createElement('style'); s.id = 'twk-coin-css';
    s.textContent =
      '.tn2 .twk-coin,.twk-coin{position:relative;display:flex;align-items:center;gap:9px;margin-left:8px;padding:6px 13px 6px 9px;border-radius:14px;border:1.5px solid #d7a93f;background:linear-gradient(180deg,#1d180b,#090807);color:#fff !important;text-decoration:none;font:700 12px "JetBrains Mono",monospace;letter-spacing:.03em;box-shadow:inset 0 1px 0 #ffffff20,0 0 20px rgba(255,180,40,.2);transition:transform .15s,box-shadow .2s}' +
      '.twk-coin:hover{transform:translateY(-2px);box-shadow:0 0 30px rgba(255,143,0,.55)}' +
      '.twk-coin .pig{width:34px;height:28px;flex:none;filter:drop-shadow(0 0 6px rgba(255,143,0,.5))}.twk-coin .pig svg{width:100%;height:100%;display:block}' +
      '.twk-coin .wb{display:flex;flex-direction:column;gap:4px;min-width:89px}.twk-coin .wallet-heading{font:800 9px/1 "JetBrains Mono",monospace;letter-spacing:.2em;color:#f4d47a}.twk-coin .wr{display:flex;align-items:center;gap:5px;line-height:1}.twk-coin .wl{width:42px;color:#aaa6a0;font:700 8px/1 "JetBrains Mono",monospace;letter-spacing:.1em}' +
      '.twk-coin .tcv,.twk-coin .tcc2{min-width:1.4ch;font-variant-numeric:tabular-nums}.twk-coin .tcv{color:#8dffa6}.twk-coin .tcc2{color:#ffd27a}' +
      '.bill{display:inline-grid;place-items:center;width:20px;height:12px;border-radius:2px;background:linear-gradient(135deg,#2e8b4a,#8be3a0 55%,#2e8b4a);border:1px solid #bff5cb;color:#0b3d1c;font:900 8px Inter,sans-serif;flex:none;position:relative}.bill:after{content:"";position:absolute;inset:2px;border:1px solid rgba(11,61,28,.45);border-radius:1px}' +
      '.gcoin{display:inline-block;width:16px;height:16px;perspective:200px;flex:none}.gcoin i{display:block;width:100%;height:100%;position:relative;transform-style:preserve-3d;animation:gcs 9s linear infinite}.gcoin b{position:absolute;inset:0;border-radius:50%;background:url(/assets/bunny-engraved.png) center/72% no-repeat,radial-gradient(circle at 35% 30%,#fff3b0,#f6c343 40%,#b9770e 80%,#7a4a06);border:1.5px solid #fbd46b;backface-visibility:hidden}.gcoin b:nth-child(2){transform:rotateY(180deg)}' +
      '@keyframes gcs{to{transform:rotateY(360deg)}}' +
      '.twk-coin .wr.pl{display:none}.twk-coin.hp .wr.pl{display:flex}.twk-coin .plc{display:inline-block;width:16px;height:16px;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%,#fff,#d9dde5 45%,#737986);border:1.5px solid #e6e9ef;box-shadow:0 0 8px rgba(220,225,235,.55);animation:plg 2.6s ease-in-out infinite}.twk-coin .tcp{color:#e7eaf0;min-width:1.4ch;font-variant-numeric:tabular-nums}' +
      '.twk-coin .wr .bill,.twk-coin .wr .gcoin,.twk-coin .wr .plc{transition:transform .16s ease,filter .16s ease;transform:perspective(90px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) scale(var(--s,1))}.twk-coin .wr.hov .bill,.twk-coin .wr.hov .gcoin,.twk-coin .wr.hov .plc{position:relative;z-index:6}.twk-coin .wr.hov .bill{filter:brightness(1.25) drop-shadow(0 0 6px rgba(120,255,170,.7))}.twk-coin .wr.hov .gcoin{filter:brightness(1.2) drop-shadow(0 0 6px rgba(255,200,80,.85))}.twk-coin .wr.hov .plc{filter:brightness(1.18) drop-shadow(0 0 7px rgba(230,236,255,.9))}' +
      '.twk-coin .vch{display:none;width:33px;margin-top:2px;position:relative;z-index:5;transform-origin:0 0;transition:transform .25s ease,filter .25s ease}.twk-coin .vch:hover{transform:scale(4.4);filter:drop-shadow(0 8px 22px rgba(0,0,0,.6))}.twk-coin.hv .vch{display:block}.gtk svg{display:block;width:100%;height:auto;overflow:visible}.gtk .sh{animation:gtsh 7s ease-in-out infinite}@keyframes gtsh{0%,62%{transform:translateX(-140px)}100%{transform:translateX(460px)}}#vgt{perspective:700px;width:min(380px,92%);margin:16px auto 0;filter:drop-shadow(0 6px 26px rgba(246,195,67,.38));cursor:help}#vgt[hidden]{display:none}@media(prefers-reduced-motion:reduce){.gtk .sh{animation:none}}' +
      '@keyframes plg{50%{box-shadow:0 0 14px rgba(240,244,255,.95)}}' +
      '.twk-coin.win{animation:tcw 1.3s ease-out}.twk-coin.win .pig{animation:pw .6s ease-out}@keyframes pw{30%{transform:scale(1.25) rotate(-6deg)}}' +
      '@keyframes tcw{0%{transform:scale(1)}15%{transform:scale(1.14);box-shadow:0 0 50px rgba(255,210,90,.95)}100%{transform:scale(1)}}' +
      '.tcf{position:fixed;z-index:100000;pointer-events:none;font:400 30px Anton,sans-serif;color:#9dffb1;text-shadow:0 0 14px #1fbf55,0 2px 0 #0b3d1c;animation:tcup 1.6s ease-out forwards}.tcf.g{color:#ffe08a;text-shadow:0 0 14px #ff8f00,0 2px 0 #7a4a06}' +
      '@keyframes tcup{0%{opacity:0;transform:translateY(10px) scale(.6)}15%{opacity:1;transform:translateY(-6px) scale(1.2)}100%{opacity:0;transform:translateY(-70px) scale(1)}}' +
      '.tcc{position:fixed;z-index:100000;pointer-events:none;width:22px;height:13px;border-radius:2px;background:linear-gradient(135deg,#2e8b4a,#8be3a0 55%,#2e8b4a);border:1px solid #bff5cb;animation:tcb 1.1s cubic-bezier(.2,.7,.4,1) forwards}.tcc.g{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f6c343 45%,#b9770e);border:1.5px solid #fbd46b}' +
      '@keyframes tcb{0%{opacity:1;transform:translate(0,0) scale(1) rotate(0)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.5) rotate(540deg)}}' +
      '@media(max-width:900px){.twk-coin{margin-left:auto;padding:4px 9px 4px 6px;gap:6px}.tn2 details{margin-left:10px}.twk-coin .pig{width:28px}}' +
      '@media(max-width:560px){.twk-coin{gap:5px;padding:4px 7px;margin-left:4px}.twk-coin .wb{min-width:64px}.twk-coin .wl{display:none}.twk-coin .wallet-heading{font-size:8px}}' +
      '@media(prefers-reduced-motion:reduce){.gcoin i,.twk-coin.win{animation:none}.tcc{display:none}}';
    document.head.appendChild(s);
  }
  var el, val, cval, shown = 0, cshown = null;
  function st() { try { return (window.AlexiaTokens && AlexiaTokens.getState()) || { balance: 0 }; } catch (e) { return { balance: 0 }; } }
  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); }
  function countTo(to, ms) {
    var from = shown, t0 = performance.now(); ms = ms || 1100;
    (function step(t) { var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); shown = Math.round(from + (to - from) * e); val.textContent = fmt(shown); if (p < 1) requestAnimationFrame(step); else { shown = to; val.textContent = fmt(to); } })(t0);
  }
  function burst(n, kind) {
    var r = el.getBoundingClientRect(), x = r.left + 22, y = r.top + 20, i;
    var f = document.createElement('div'); f.className = 'tcf' + (kind === 'coin' ? ' g' : ''); f.textContent = '+' + n; f.style.left = (r.left + 10) + 'px'; f.style.top = (r.bottom + 6) + 'px'; document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1700);
    var k = Math.min(14, 6 + Math.round(n / 20));
    for (i = 0; i < k; i++) {
      var c = document.createElement('i'); c.className = 'tcc' + (kind === 'coin' ? ' g' : ''); c.style.left = x + 'px'; c.style.top = y + 'px';
      var a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', (Math.sin(a) * d + 40) + 'px');
      document.body.appendChild(c); (function (q) { setTimeout(function () { q.remove(); }, 1200); })(c);
    }
  }
  function celebrate(n, big, kind) {
    if (!el) return; n = n || 0;
    el.classList.remove('win'); void el.offsetWidth; el.classList.add('win'); setTimeout(function () { el.classList.remove('win'); }, 1400);
    burst(n, kind); sound(!!big || n >= 100);
  }
  function mount() {
    if (el || !document.body) return; css();
    var w = document.querySelector('.tn2-w'); if (!w) return;
    document.querySelectorAll('.twk-nav-v1-tokens,.twk-tokens-pill,#twk-tokens-pill').forEach(function (x) { x.remove(); });
    el = document.createElement('a'); el.className = 'twk-coin'; el.href = '/tokens/'; el.setAttribute('aria-label', 'My tokens');
    el.innerHTML = '<span class="pc" style="display:flex;flex-direction:column;align-items:center;gap:3px"><span class="pig"><svg viewBox="0 0 320 260"><defs><linearGradient id="wpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".55" stop-color="#ff8f00"/><stop offset="1" stop-color="#b25400"/></linearGradient></defs><rect x="86" y="190" width="34" height="42" rx="10" fill="#b25400"/><rect x="196" y="190" width="34" height="42" rx="10" fill="#b25400"/><path d="M262 120c26-6 40 8 30 24-6 10-18 6-14-4 3-8-8-10-16-6z" fill="none" stroke="#ff8f00" stroke-width="10" stroke-linecap="round"/><ellipse cx="158" cy="130" rx="118" ry="84" fill="url(#wpg)"/><path d="M70 88c10-30 38-36 52-30-14 10-24 20-26 44z" fill="#ffb347"/><ellipse cx="44" cy="140" rx="32" ry="26" fill="#ff9f1f"/><circle cx="94" cy="108" r="9" fill="#150a00"/><rect x="120" y="54" width="72" height="14" rx="7" fill="#4a2200"/></svg></span><span class="vch gtk" aria-label="Golden Ticket"></span></span><span class="wb"><span class="wallet-heading">BALANCE</span><span class="wr"><span class="wl">TOKENS</span><span class="bill">T</span><span class="tcv">0</span></span><span class="wr"><span class="wl">COINS</span><span class="gcoin"><i><b></b><b></b></i></span><span class="tcc2">0</span></span><span class="wr pl"><span class="wl">PLATINUM</span><span class="plc"></span><span class="tcp">0</span></span></span>';
    (function () {
      if (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) return;
      var lastSnd = 0;
      [].forEach.call(el.querySelectorAll('.wr'), function (row) {
        var ic = row.querySelector('.bill,.gcoin,.plc'); if (!ic) return;
        row.addEventListener('pointerenter', function () { row.classList.add('hov'); var n = Date.now(); if (n - lastSnd > 450) { lastSnd = n; try { sound(false); } catch (e) {} } });
        row.addEventListener('pointermove', function (e) {
          var r = ic.getBoundingClientRect(), nx = (e.clientX - (r.left + r.width / 2)) / 40, ny = (e.clientY - (r.top + r.height / 2)) / 24;
          nx = Math.max(-1, Math.min(1, nx)); ny = Math.max(-1, Math.min(1, ny));
          ic.style.setProperty('--ry', (nx * 38).toFixed(1) + 'deg'); ic.style.setProperty('--rx', (-ny * 30).toFixed(1) + 'deg'); ic.style.setProperty('--s', '2.6');
        });
        row.addEventListener('pointerleave', function () { row.classList.remove('hov'); ic.style.setProperty('--ry', '0deg'); ic.style.setProperty('--rx', '0deg'); ic.style.setProperty('--s', '1'); });
      });
    })();
    val = el.querySelector('.tcv'); cval = el.querySelector('.tcc2'); el.title = 'My wallet: tokens and coins';
    var d = w.querySelector('details'); if (d) w.insertBefore(el, d); else w.appendChild(el);
    var cur = Math.round(st().balance || 0), seen = NaN; try { seen = parseInt(localStorage.getItem('twk_coin_seen'), 10); } catch (e) {}
    shown = (!isNaN(seen) && cur > seen) ? seen : cur; val.textContent = fmt(shown);
    if (cur > shown) setTimeout(function () { var d0 = cur - shown; countTo(cur); celebrate(d0, d0 >= 100); }, 700);
    try { localStorage.setItem('twk_coin_seen', String(cur)); } catch (e) {}
    function pullCoins() {
      var auth = {}; try { auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}; } catch (e) {}
      var headers = auth.token ? { Authorization: 'Bearer ' + auth.token } : {};
      fetch('/api/jenny/unlock', { credentials: 'same-origin', headers: headers }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.ok) return; var c = d.coins || 0;
        if (cshown !== null && c > cshown) { celebrate(c - cshown, true, 'coin'); }
        cshown = c; cval.textContent = c;
        try { var u = JSON.parse(localStorage.getItem('alexia_current_user') || '{}'); if (u.email) localStorage.setItem('twk_coins_cache_v1', JSON.stringify({ email: String(u.email).toLowerCase(), coins: c })); } catch (e) {}
      }).catch(function () {});
    }
    try { var u0 = JSON.parse(localStorage.getItem('alexia_current_user') || '{}'), cc = JSON.parse(localStorage.getItem('twk_coins_cache_v1') || '{}'); if (u0.email && String(cc.email || '').toLowerCase() === String(u0.email).toLowerCase() && Number.isFinite(Number(cc.coins))) { cshown = Number(cc.coins); cval.textContent = cshown; } } catch (e) {}
    var gtN = 0, VT = 'Very rare voucher · Easter egg. Not ready to redeem yet, it will be available soon.';
    function GT(big) {
      var n = ++gtN, g = 'gtg' + n, c = 'gtc' + n, h = 'gth' + n, l = 'gtl' + n, m = 'gtm' + n;
      var P = 'M0 9Q0 0 9 0H291Q300 0 300 9V44a11 11 0 0 0 0 22V101Q300 110 291 110H9Q0 110 0 101V66a11 11 0 0 0 0-22Z';
      var bars = '', bx = 244, bw = [2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2];
      for (var k = 0; k < bw.length; k++) { bars += '<rect x="' + bx + '" y="66" width="' + (bw[k] * 0.8).toFixed(1) + '" height="24" fill="#5a3500" fill-opacity=".8"/>'; bx += bw[k] * 0.8 + 1; }
      return '<svg viewBox="0 0 300 110" role="img" aria-label="Golden Ticket"><defs>' +
        '<linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".22" stop-color="#f9d24f"/><stop offset=".5" stop-color="#cf8f0c"/><stop offset=".72" stop-color="#f6c546"/><stop offset="1" stop-color="#fff0a0"/></linearGradient>' +
        '<pattern id="' + l + '" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><path d="M0 2H4" stroke="#7a4a06" stroke-opacity=".16" stroke-width=".7"/></pattern>' +
        '<linearGradient id="' + m + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#5a3500" stop-opacity=".28"/></linearGradient>' +
        '<linearGradient id="' + h + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<clipPath id="' + c + '"><path d="' + P + '"/></clipPath>' + (big ? '<filter id="gtf' + n + '" x="-4%" y="-8%" width="108%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".008 .014" numOctaves="1" seed="7" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter><radialGradient id="gtd' + n + '"><stop offset="0" stop-color="#3a2300" stop-opacity=".55"/><stop offset=".55" stop-color="#3a2300" stop-opacity=".18"/><stop offset="1" stop-color="#3a2300" stop-opacity="0"/></radialGradient><radialGradient id="gtr' + n + '"><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset=".82" stop-color="#fff7c8" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' : '') + '</defs><g class="gtw">' +
        '<path d="' + P + '" fill="url(#' + g + ')"/><path d="' + P + '" fill="url(#' + l + ')"/><path d="' + P + '" fill="url(#' + m + ')"/><path d="' + P + '" fill="none" stroke="#fff4b0" stroke-width="2"/>' +
        '<g clip-path="url(#' + c + ')">' +
        '<path d="M14 12H286V98H14Z" fill="none" stroke="#6b4206" stroke-opacity=".6" stroke-width="1.3"/><path d="M18 16H282V94H18Z" fill="none" stroke="#fff3b0" stroke-opacity=".7" stroke-width=".8" stroke-dasharray="1.5 2.5"/>' +
        '<circle cx="40" cy="55" r="22" fill="#6b4206" fill-opacity=".14" stroke="#6b4206" stroke-opacity=".7" stroke-width="1.4"/><circle cx="40" cy="55" r="18" fill="none" stroke="#fff3b0" stroke-opacity=".8" stroke-width=".8"/><image href="/assets/bunny-engraved.png" x="25" y="40" width="30" height="30" opacity=".85"/>' +
        '<path d="M238 16V94" stroke="#6b4206" stroke-opacity=".65" stroke-width="1.3" stroke-dasharray="3 3"/>' + bars +
        '<text x="264" y="56" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="6.5" letter-spacing="1" fill="#5a3500" fill-opacity=".85">Nº 0001</text><text x="264" y="44" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="6.5" letter-spacing="1.2" fill="#5a3500" fill-opacity=".75">ADMIT</text>' +
        '<text x="140" y="56" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" letter-spacing="1.2" fill="#fff6c8" fill-opacity=".9" transform="translate(.9,1.4)">GOLDEN TICKET</text><text x="140" y="56" text-anchor="middle" font-family="Anton,Impact,sans-serif" font-size="26" letter-spacing="1.2" fill="#4d2d00">GOLDEN TICKET</text>' +
        '<path d="M80 66H200" stroke="#6b4206" stroke-opacity=".6" stroke-width="1"/><text x="140" y="80" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="8.5" letter-spacing="2.4" fill="#5a3500">VIP VOUCHER · TWERKHUB</text>' +
        (big ? '<circle class="gtdr" r="34" cx="150" cy="55" fill="url(#gtr' + n + ')" opacity="0"/><circle class="gtdd" r="30" cx="150" cy="55" fill="url(#gtd' + n + ')" opacity="0"/>' : '') + '<rect class="sh" x="-60" y="-10" width="46" height="130" fill="url(#' + h + ')" transform="skewX(-18)"/></g></g></svg>';
    }
    function tactile(host) {
      if (host._tc || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) return; host._tc = 1;
      var svg = host.querySelector('svg'), grp = svg.querySelector('.gtw'), fl = svg.querySelector('filter'), dm = fl.querySelector('feDisplacementMap'),
        dd = svg.querySelector('.gtdd'), dr = svg.querySelector('.gtdr'), fid = fl.id;
      var tx = 0, ty = 0, ta = 0, cx = 0, cy = 0, ca = 0, px = 150, py = 55, raf = 0;
      function loop() {
        cx += (tx - cx) * .16; cy += (ty - cy) * .16; ca += (ta - ca) * .12;
        svg.style.transform = 'perspective(700px) rotateX(' + (-cy * 9).toFixed(2) + 'deg) rotateY(' + (cx * 11).toFixed(2) + 'deg) scale(' + (1 + ca * .025).toFixed(4) + ')';
        dm.setAttribute('scale', (ca * 2.4).toFixed(2));
        if (ca > .02) grp.setAttribute('filter', 'url(#' + fid + ')'); else grp.removeAttribute('filter');
        dd.setAttribute('cx', px); dd.setAttribute('cy', py); dr.setAttribute('cx', px - 1.5); dr.setAttribute('cy', py - 1.5);
        dd.setAttribute('opacity', ca.toFixed(2)); dr.setAttribute('opacity', (ca * .8).toFixed(2));
        if (ta === 0 && ca < .01 && Math.abs(cx) < .01 && Math.abs(cy) < .01) { svg.style.transform = ''; grp.removeAttribute('filter'); raf = 0; return; }
        raf = requestAnimationFrame(loop);
      }
      function go() { if (!raf) raf = requestAnimationFrame(loop); }
      var lx = 0, ly = 0, lt = 0;
      host.addEventListener('pointerenter', function () { paper(1); });
      host.addEventListener('pointermove', function (e) {
        var r = svg.getBoundingClientRect(); if (!r.width) return;
        var nowT = Date.now(), mv = Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly); if (nowT - lt > 140 && mv > 14) { paper(.55); lt = nowT; lx = e.clientX; ly = e.clientY; }
        var nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
        tx = Math.max(-1, Math.min(1, (nx - .5) * 2)); ty = Math.max(-1, Math.min(1, (ny - .5) * 2)); px = nx * 300; py = ny * 110; ta = 1; go();
      });
      host.addEventListener('pointerleave', function () { tx = 0; ty = 0; ta = 0; go(); });
    }
    function setPlat(p, v) {
      p = Number(p) || 0; v = Number(v) || 0; var pe = el.querySelector('.tcp'); if (pe) pe.textContent = String(p);
      el.classList.toggle('hp', p > 0); el.classList.toggle('hv', v > 0);
      var vc = el.querySelector('.vch'); if (v > 0 && vc && !vc.firstChild) vc.innerHTML = GT(); if (vc) vc.title = VT;
      var pg = document.getElementById('vgt'); if (pg) { if (v > 0 && !pg.firstChild) { pg.innerHTML = GT(true); tactile(pg); } pg.hidden = v <= 0; pg.title = VT; }
      el.title = p > 0 ? 'Platinum coins: the reward is not ready to redeem yet. It will be available soon.' : 'My wallet: tokens and coins';
      try { localStorage.setItem('twk_plat_cache_v1', JSON.stringify({ p: p, v: v })); } catch (er) {}
    }
    function pullPlat() {
      var auth = {}; try { auth = JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}; } catch (e) {}
      var headers = auth.token ? { Authorization: 'Bearer ' + auth.token } : {};
      fetch('/api/novinhas/hunt', { credentials: 'same-origin', headers: headers }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (d && d.auth && d.wallet) setPlat(d.wallet.platinum, d.wallet.voucher);
        if (d && d.auth) { var pe = null; try { pe = localStorage.getItem('twk-hunt-pending-egg'); } catch (e) {}
          if (pe === 'hit' || pe === 'great') { var sid = ''; try { sid = localStorage.getItem('twk-hunt-sid') || ''; } catch (e) {}
            fetch('/api/novinhas/hunt', { method: 'POST', credentials: 'same-origin', headers: Object.assign({ 'Content-Type': 'application/json' }, headers), body: JSON.stringify({ ev: pe, sid: sid }) }).then(function (r) { return r.ok ? r.json() : null; }).then(function (o) { if (o && o.auth) { try { localStorage.removeItem('twk-hunt-pending-egg'); } catch (e) {} setPlat(o.platinum, o.voucher); } }).catch(function () {}); } }
      }).catch(function () {});
    }
    try { var pc0 = JSON.parse(localStorage.getItem('twk_plat_cache_v1') || '{}'); if (pc0.p > 0) setPlat(pc0.p, pc0.v); } catch (e) {}
    addEventListener('twk-platinum-changed', function (e) { var d = e.detail || {}; setPlat(d.platinum, d.voucher); });
    pullPlat();
    pullCoins(); setInterval(pullCoins, 60000); addEventListener('focus', pullCoins);
    addEventListener('alexia-tokens-changed', function (e) {
      var b = Math.round(((e.detail || st()).balance) || 0), diff = b - shown;
      if (diff > 0) { countTo(b); celebrate(diff, diff >= 100); } else { shown = b; val.textContent = fmt(b); } try { localStorage.setItem('twk_coin_seen', String(b)); } catch (er) {}
    });
    addEventListener('twk-coins-changed', function (e) {
      var n = Number(e.detail && e.detail.coins); if (!Number.isFinite(n) || n < 0) return;
      cshown = n; if (cval) cval.textContent = String(n);
      try { var u = JSON.parse(localStorage.getItem('alexia_current_user') || '{}'); if (u.email) localStorage.setItem('twk_coins_cache_v1', JSON.stringify({ email: String(u.email).toLowerCase(), coins: n })); } catch (er) {}
    });
    addEventListener('alexia-level-up', function () { setTimeout(function () { sound(true); }, 500); });
    addEventListener('storage', function () { var b = Math.round(st().balance || 0); if (b !== shown) countTo(b, 500); });
  }
  try { var q = new URLSearchParams(location.search).get('ref'); if (q && !localStorage.getItem('twk_ref')) { localStorage.setItem('twk_ref', q.slice(0, 60)); localStorage.setItem('twk_ref_at', String(Date.now())); } } catch (e) {}
  window.TwkCoin = { refresh: function () {}, celebrate: celebrate, paper: paper, sound: sound, soundOn: soundOn, setSound: function (on) { try { localStorage.setItem(NSK, on ? 'on' : 'off'); } catch (e) {} }, mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 800);
  if (!window.AlexiaTokens && !document.querySelector('script[src*="token-system"]')) { var s = document.createElement('script'); s.src = '/assets/token-system.js'; s.defer = true; s.onload = function () { if (el && window.AlexiaTokens) { shown = Math.round(st().balance || 0); val.textContent = fmt(shown); } }; document.head.appendChild(s); }
})();
