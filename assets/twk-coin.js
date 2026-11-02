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
      '.tn2 .twk-coin,.twk-coin{position:relative;display:flex;align-items:center;gap:9px;margin-left:8px;padding:6px 14px 6px 8px;border-radius:14px;border:2px solid var(--ac,#ff8f00);background:linear-gradient(180deg,#1a1205,#0a0703);color:#ffd27a !important;text-decoration:none;font:700 15px "JetBrains Mono",monospace;letter-spacing:.04em;box-shadow:0 0 18px rgba(255,143,0,.25);transition:transform .15s,box-shadow .2s}' +
      '.twk-coin:hover{transform:translateY(-2px);box-shadow:0 0 30px rgba(255,143,0,.55)}' +
      '.tcn{width:30px;height:30px;perspective:300px;flex:none}.tcn i{display:block;position:relative;width:100%;height:100%;transform-style:preserve-3d;animation:tcs 5s linear infinite}' +
      '.tcn i b{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f6c343 38%,#b9770e 78%,#7a4a06);border:2px solid #fbd46b;display:grid;place-items:center;font:400 15px Anton,sans-serif;color:#7a4a06;text-shadow:0 1px 0 #ffe9a3}' +
      '.tcn i b:nth-child(1){transform:translateZ(2.5px)}.tcn i b:nth-child(2){transform:translateZ(1.25px);filter:brightness(.8);color:transparent}.tcn i b:nth-child(3){transform:translateZ(0);filter:brightness(.7);color:transparent}.tcn i b:nth-child(4){transform:translateZ(-1.25px);filter:brightness(.8);color:transparent}.tcn i b:nth-child(5){transform:translateZ(-2.5px) rotateY(180deg)}' +
      '@keyframes tcs{to{transform:rotateY(360deg)}}' +
      '.twk-coin.win .tcn i{animation:tcs .6s linear infinite}.twk-coin.win{animation:tcw 1.3s ease-out}' +
      '@keyframes tcw{0%{transform:scale(1)}15%{transform:scale(1.14);box-shadow:0 0 50px rgba(255,210,90,.95)}100%{transform:scale(1)}}' +
      '.twk-coin .tcv{min-width:1.6ch;text-align:right;font-variant-numeric:tabular-nums}' +
      '.tcf{position:fixed;z-index:100000;pointer-events:none;font:400 30px Anton,sans-serif;color:#ffe08a;text-shadow:0 0 14px #ff8f00,0 2px 0 #7a4a06;animation:tcup 1.6s ease-out forwards}' +
      '@keyframes tcup{0%{opacity:0;transform:translateY(10px) scale(.6)}15%{opacity:1;transform:translateY(-6px) scale(1.2)}100%{opacity:0;transform:translateY(-70px) scale(1)}}' +
      '.tcc{position:fixed;z-index:100000;pointer-events:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#f6c343 45%,#b9770e);border:1.5px solid #fbd46b;animation:tcb 1.1s cubic-bezier(.2,.7,.4,1) forwards}' +
      '@keyframes tcb{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.5) rotate(540deg)}}' +
      '@media(max-width:900px){.twk-coin{margin-left:auto}.tn2 details{margin-left:10px}}' +
      '@media(prefers-reduced-motion:reduce){.tcn i,.twk-coin.win{animation:none}.tcc{display:none}}';
    document.head.appendChild(s);
  }
  var el, val, shown = 0;
  function st() { try { return (window.AlexiaTokens && AlexiaTokens.getState()) || { balance: 0 }; } catch (e) { return { balance: 0 }; } }
  function fmt(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n); }
  function countTo(to, ms) {
    var from = shown, t0 = performance.now(); ms = ms || 1100;
    (function step(t) { var p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); shown = Math.round(from + (to - from) * e); val.textContent = fmt(shown); if (p < 1) requestAnimationFrame(step); else { shown = to; val.textContent = fmt(to); } })(t0);
  }
  function burst(n) {
    var r = el.getBoundingClientRect(), x = r.left + 22, y = r.top + 20, i;
    var f = document.createElement('div'); f.className = 'tcf'; f.textContent = '+' + n; f.style.left = (r.left + 10) + 'px'; f.style.top = (r.bottom + 6) + 'px'; document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1700);
    var k = Math.min(14, 6 + Math.round(n / 20));
    for (i = 0; i < k; i++) {
      var c = document.createElement('i'); c.className = 'tcc'; c.style.left = x + 'px'; c.style.top = y + 'px';
      var a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 90;
      c.style.setProperty('--dx', Math.cos(a) * d + 'px'); c.style.setProperty('--dy', (Math.sin(a) * d + 40) + 'px');
      document.body.appendChild(c); (function (q) { setTimeout(function () { q.remove(); }, 1200); })(c);
    }
  }
  function celebrate(n, big) {
    if (!el) return; n = n || 0;
    el.classList.remove('win'); void el.offsetWidth; el.classList.add('win'); setTimeout(function () { el.classList.remove('win'); }, 1400);
    burst(n); sound(!!big || n >= 100);
  }
  function mount() {
    if (el || !document.body) return; css();
    var w = document.querySelector('.tn2-w'); if (!w) return;
    document.querySelectorAll('.twk-nav-v1-tokens,.twk-tokens-pill,#twk-tokens-pill').forEach(function (x) { x.remove(); });
    el = document.createElement('a'); el.className = 'twk-coin'; el.href = '/tokens/'; el.setAttribute('aria-label', 'My tokens');
    el.innerHTML = '<span class="tcn"><i><b>T</b><b></b><b></b><b></b><b>T</b></i></span><span class="tcv">0</span>';
    val = el.querySelector('.tcv');
    var d = w.querySelector('details'); if (d) w.insertBefore(el, d); else w.appendChild(el);
    var cur = Math.round(st().balance || 0), seen = NaN; try { seen = parseInt(localStorage.getItem('twk_coin_seen'), 10); } catch (e) {}
    shown = (!isNaN(seen) && cur > seen) ? seen : cur; val.textContent = fmt(shown);
    if (cur > shown) setTimeout(function () { var d0 = cur - shown; countTo(cur); celebrate(d0, d0 >= 100); }, 700);
    try { localStorage.setItem('twk_coin_seen', String(cur)); } catch (e) {}
    addEventListener('alexia-tokens-changed', function (e) {
      var b = Math.round(((e.detail || st()).balance) || 0), diff = b - shown;
      if (diff > 0) { countTo(b); celebrate(diff, diff >= 100); } else { shown = b; val.textContent = fmt(b); } try { localStorage.setItem('twk_coin_seen', String(b)); } catch (er) {}
    });
    addEventListener('alexia-level-up', function () { setTimeout(function () { sound(true); }, 500); });
    addEventListener('storage', function () { var b = Math.round(st().balance || 0); if (b !== shown) countTo(b, 500); });
  }
  window.TwkCoin = { celebrate: celebrate, sound: sound, soundOn: soundOn, setSound: function (on) { try { localStorage.setItem(NSK, on ? 'on' : 'off'); } catch (e) {} }, mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
  setTimeout(mount, 800);
  if (!window.AlexiaTokens && !document.querySelector('script[src*="token-system"]')) { var s = document.createElement('script'); s.src = '/assets/token-system.js'; s.defer = true; s.onload = function () { if (el && window.AlexiaTokens) { shown = Math.round(st().balance || 0); val.textContent = fmt(shown); } }; document.head.appendChild(s); }
})();
