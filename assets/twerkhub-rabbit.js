/* Twerkhub rabbit: shows up now and then, dodges the mouse a few times, then gets tired and can be caught.
   Prize is decided by the server (/api/jenny/rabbit). Only for logged-in visitors. */
(function () {
  if (window.__twkRabbit) return; window.__twkRabbit = 1;
  var API = '/api/jenny/rabbit', W = 96, H = 128;
  var css = '.twr{position:fixed;left:0;top:0;width:' + W + 'px;height:' + H + 'px;z-index:9998;cursor:pointer;perspective:500px;transition:transform .42s cubic-bezier(.3,1.4,.5,1);will-change:transform;touch-action:manipulation}' +
    '.twr .rb{width:100%;height:100%;position:relative;transform-style:preserve-3d;animation:twrhop .42s ease-in-out infinite}' +
    '.twr .rb img{width:100%;height:100%;display:block;filter:drop-shadow(0 6px 6px rgba(0,0,0,.55)) drop-shadow(0 0 16px rgba(255,61,180,.55));transition:transform .3s;transform:rotateY(var(--ry,-14deg)) rotateX(6deg)}' +
    '.twr.l .rb img{--ry:14deg;transform:scaleX(-1) rotateY(-14deg) rotateX(6deg)}' +
    '.twr:after{content:"";position:absolute;left:12%;right:12%;bottom:-8px;height:12px;border-radius:50%;background:radial-gradient(#000a,#0000 70%);animation:twrsh .42s ease-in-out infinite}' +
    '.twr.tired .rb{animation:twrtired 1s ease-in-out infinite}' +
    '.twr .bb{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);width:max-content;max-width:230px;padding:9px 13px;border-radius:14px;background:linear-gradient(180deg,#2a2208,#0d0b04);border:1.5px solid #e8b84a;color:#fff;font:800 12px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 8px 24px #000a,0 0 18px #e8b84a44;pointer-events:none}' +
    '.twr .bb small{display:block;font-weight:600;font-size:10px;color:#e8c878;margin-top:2px}' +
    '.twr .bb:after{content:"";position:absolute;top:100%;left:50%;margin-left:-7px;border:7px solid transparent;border-top-color:#e8b84a}' +
    '@keyframes twrhop{0%,100%{transform:translateY(0) scale(1.06,.94)}50%{transform:translateY(-16px) scale(.96,1.05)}}@keyframes twrsh{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.5}}@keyframes twrtired{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-3px) rotate(3deg)}}' +
    '.twrw{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:rgba(0,0,0,.75)}.twrw div{max-width:340px;padding:28px 26px;border-radius:18px;border:1.5px solid #e8b84a;background:linear-gradient(180deg,#2a2208,#0d0b04);color:#fff;text-align:center;font:600 14px/1.5 system-ui,sans-serif;box-shadow:0 0 60px #e8b84a55}.twrw b{display:block;font:900 30px system-ui;color:#ffd76a;margin:6px 0}.twrw img{height:90px}.twrw button{margin-top:14px;padding:12px 22px;border-radius:12px;border:1.5px solid #ffc266;background:linear-gradient(180deg,#ffa133,#ff7a00);color:#1a0e00;font:800 13px system-ui;cursor:pointer}' +
    '@media(prefers-reduced-motion:reduce){.twr .rb,.twr:after{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  function post(b) { return fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(function (r) { return r.json().catch(function () { return {}; }); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function show() {
    if (document.querySelector('.twr')) return;
    post({ action: 'spawn' }).then(function (d) {
      if (!d || !d.eligible || !d.id) return;
      var vw = innerWidth, vh = innerHeight, el = document.createElement('div'); el.className = 'twr';
      el.innerHTML = '<div class="bb">Click the rabbit and win $1 to $25 in coins<small>One try a day. Limits apply.</small></div><div class="rb"><img src="/assets/rabbit.png" alt="Rabbit" draggable="false"></div>';
      var x = -W - 10, y = rnd(vh * .3, vh * .7), dodges = 0, tired = false, done = false, last = 0;
      function mv(nx, ny) { nx = Math.max(8, Math.min(vw - W - 8, nx)); ny = Math.max(90, Math.min(vh - H - 8, ny)); el.classList.toggle('l', nx < x); x = nx; y = ny; el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
      el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; document.body.appendChild(el);
      setTimeout(function () { mv(rnd(vw * .55, vw - W - 20), y); }, 60);
      function flee() {
        if (tired || done) return; dodges++;
        if (dodges > 6) { tired = true; el.classList.add('tired'); el.style.transition = 'transform .3s'; setTimeout(function () { if (!done) { tired = false; el.classList.remove('tired'); dodges = 4; } }, 3000); return; }
        var nx, ny, t = 0; do { nx = rnd(8, vw - W - 8); ny = rnd(90, vh - H - 8); t++; } while (t < 12 && Math.hypot(nx - x, ny - y) < Math.min(vw, vh) * .4);
        mv(nx, ny);
      }
      function near(e) { if (done || tired) return; var n = Date.now(); if (n - last < 380) return; var c = e.touches ? e.touches[0] : e; if (Math.hypot(c.clientX - (x + W / 2), c.clientY - (y + H / 2)) < 130) { last = n; flee(); } }
      document.addEventListener('mousemove', near);
      var ti = setInterval(function () { if (matchMedia('(hover:none)').matches) flee(); }, 900);
      var end = setTimeout(function () { bye(); }, 24000);
      function bye() { done = true; clearInterval(ti); clearTimeout(end); document.removeEventListener('mousemove', near); el.style.transition = 'transform .6s ease-in'; mv(vw + 40, y); setTimeout(function () { el.remove(); }, 700); }
      el.addEventListener('click', function () {
        if (done) return; done = true; clearInterval(ti); clearTimeout(end); document.removeEventListener('mousemove', near); el.remove();
        post({ action: 'catch', id: d.id }).then(function (r) {
          var w = document.createElement('div'); w.className = 'twrw';
          w.innerHTML = r && r.ok ? '<div><img src="/assets/rabbit.png" alt=""><br>You caught it!<b>$' + r.usd + ' in coins</b>' + r.coins + ' coins were added to your balance.<br><span style="display:block;margin-top:12px;font:600 12px/1.45 system-ui,sans-serif;color:#ffd76a">Dear user, a gentle reminder: some of us work rather hard for the content you enjoy every night, free of charge. Do stop jerking off for free every night and consider a small donation. It\'s the least a gentleman could do, you absolute scoundrel.</span><button>Awesome</button></div>' : '<div><img src="/assets/rabbit.png" alt=""><br>Too late: the rabbit got away this time.<br><button>Close</button></div>';
          w.addEventListener('click', function (e) { if (e.target === w || e.target.tagName === 'BUTTON') w.remove(); }); document.body.appendChild(w);
          if (r && r.ok) { var b = document.getElementById('bal'); if (b) setTimeout(function () { location.reload(); }, 2500); }
        });
      });
    }).catch(function () {});
  }
  fetch(API, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d || !d.eligible) return;
    (function sched(t){ setTimeout(function(){ if(!document.querySelector('.twr') && !document.hidden) show(); sched(rnd(150000, 330000)); }, t); })(rnd(25000, 70000));
  }).catch(function () {});
})();
