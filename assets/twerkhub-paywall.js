/*!
 * TWERKHUB · Paywall + Auth Gate (self-installing)
 * --------------------------------------------------------------
 * Applies the Register → Subscribe friction funnel to every Twerkhub
 * playlist automatically, without requiring per-page edits.
 *
 *   Public (not registered)
 *     · Hot Ranking items (.rk-item / .hotrank a) → always clickable
 *     · Non-Hot grid cards (.vcard, [data-vid]) → subtle blur + lock,
 *       click opens the Register modal
 *   Registered, not subscribed
 *     · Non-Hot cards → click opens Subscribe modal ($9.99/mo)
 *   Subscribed
 *     · All cards work normally, no friction
 *
 * Mocked backend (demo): state persists in localStorage under
 *   `twerkhub_auth` = {"registered":bool,"subscribed":bool,"email":str}
 *
 * Copy is intentionally argentino-casual, high FOMO. Tweak in COPY below.
 *
 * Version: 2026-04-20a
 */
(function(){
  'use strict';
  if (window.TwerkhubPaywall) return;

  // ── Anti 2026-04-24 + revised 2026-04-30 ───────────────────────────
  // Kill-switch ONLY for the playlist HUB / catalog pages, NOT for
  // individual /playlist/<slug>.html detail pages.
  //   Disabled (no paywall): /playlist, /playlist/, /playlist/index.html,
  //                          /playlist-* (any sibling like /playlist-twerk).
  //   Enabled  (paywall on): /playlist/<slug>.html  → individual videos
  //                          should gate like other hub detail pages do.
  var __twkPath = (location.pathname || '').toLowerCase();
  var __twkIsPlaylistHub = (
    __twkPath === '/playlist' ||
    __twkPath === '/playlist/' ||
    __twkPath === '/playlist/index.html' ||
    /^\/playlist-/.test(__twkPath)
  );
  var __twkIsPlaylistPage = __twkIsPlaylistHub;
  if (__twkIsPlaylistPage){
    // Stub the public API so anything that calls it becomes a no-op.
    window.TwerkhubPaywall = {
      open: function(){}, close: function(){}, applyGates: function(){},
      installFomoStrip: function(){}, injectGatedHero: function(){}
    };
    // Belt-and-suspenders: scrub any leftovers already painted.
    var scrub = function(){
      ['.twk-modal', '.twk-fomo-strip', '.twk-gated-hero',
       '.twk-playlist-fomo', '.twk-fomo-pill', '.twk-gated-overlay',
       '.twerkhub-paywall-modal'].forEach(function(sel){
        document.querySelectorAll(sel).forEach(function(el){ el.remove(); });
      });
      document.querySelectorAll('.twk-gated').forEach(function(el){
        el.classList.remove('twk-gated');
      });
      document.body && (document.body.style.overflow = '');
      document.documentElement.style.overflow = '';
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scrub, { once: true });
    } else {
      scrub();
    }
    var __twkScrubN = 0;
    var __twkScrubIv = setInterval(function(){
      scrub();
      if (++__twkScrubN > 5) clearInterval(__twkScrubIv);
    }, 2000);
    return; // abort the outer IIFE — paywall stays dormant
  }

  var LS_KEY = 'twerkhub_auth';
  var STYLE_ID = 'twerkhub-paywall-style';
  var MODAL_ID = 'twerkhub-paywall-modal';

  function readAuth(){
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return { registered:false, subscribed:false, email:'' };
      var j = JSON.parse(raw);
      return {
        registered: !!j.registered,
        subscribed: !!j.subscribed,
        email: j.email || ''
      };
    } catch(_){ return { registered:false, subscribed:false, email:'' }; }
  }
  function writeAuth(next){
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch(_){}
    window.TWERKHUB_AUTH = next;
    document.dispatchEvent(new CustomEvent('twerkhub-auth-change', { detail: next }));
    // Re-apply gates everywhere
    applyGates();
  }

  var state = readAuth();
  window.TWERKHUB_AUTH = state;

  function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  var COPY = {
    // Paywall-wide header/brand
    tagline:        'Twerkhub · acceso completo',
    taglineMono:    'private archive · weekly drops · exclusive',

    // REGISTER MODAL
    registerTitle:  'Entrá al archivo privado.',
    registerPitch:  'Los videos de estas playlists son <b>privados</b>. Visibles solo desde adentro. Cada semana sumamos drops nuevos.',
    registerFomoPool: [
      '<em>Entraste. Ahora la parte buena.</em>',
      '<em>El registro es la puerta. La suscripción te abre el archivo.</em>',
      '<em>Una playlist es el trailer. Esto es la película.</em>',
      '<em>Miraste el 5%. Suscribite y mirá todo.</em>'
    ],
    registerCTA:    'Crear cuenta',

    // SUBSCRIBE MODAL — rotating headlines
    subscribeHeadlines: [
      'Lo público es la <em>portada.</em> Lo bueno está adentro.',
      'Miraste el <em>5%</em>. Suscribite y mirá todo.',
      'Lo que las redes no dejan subir, <em>acá sí.</em>',
      'Lo que filmamos de más. <em>Solo para los que entran.</em>',
      'Una playlist es el trailer. <em>Esto es la película.</em>'
    ],
    subscribePitchPool: [
      'Sesiones íntimas. Filmadas sin los filtros de las redes.',
      'Cada semana sumamos drops nuevos.',
      'Archivo privado. Visible solo desde adentro.',
      'Curado por Alexia. Para suscriptores.'
    ],
    subscribeList:  [
      'Archivo privado · visible solo desde adentro',
      'Drops nuevos cada semana en las 6 playlists',
      'TTL 4K · Korean · Try-On · Cosplay · Twerk Hub · Del Otro Lado',
      'Sesiones íntimas filmadas sin filtros de redes',
      'Hot Ranking queda como free preview'
    ],
    subscribeFooter:'Cancelás cuando quieras · acceso inmediato · cobro discreto',
    subscribeCTA:   'Unlock todo · USD 9.99/mes',
    subscribeAltCTA:'Ya soy miembro',

    // HOVER PILL over gated cards — rotated per card on hover
    hoverLockPool: [
      '🔒 solo suscriptores',
      '🔒 USD 9.99 · unlock',
      '🔒 contenido privado',
      '💎 exclusivo'
    ],

    // HOT RANKING badge
    freePreviewBadge: 'Free preview',

    // HERO banner above the gated grid
    gatedHeroLine:   'Los de arriba son el <em>adelanto</em>. Los de abajo son el archivo.',
    gatedHeroSub:    'Free preview · el archivo completo requiere acceso.',

    // FOMO pill strip — rotates every ~4s
    fomoPillPool: [
      '🔥 +12 drops nuevos esta semana',
      '💎 Exclusivo Twerkhub',
      '🚨 Solo para el círculo interno',
      '🎯 Drops semanales curados'
    ],
    livePool: [
      '👀 %N personas en este momento',
      '🔥 %N miembros activos esta semana',
      '💥 %N unlocks en las últimas 24h'
    ]
  };

  // ───────── Styles (idempotent) ─────────
  function injectStyles(){
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      // Gated card visuals — NO blur (Anti 2026-04-20, explicit rule).
      // Thumb stays sharp; the lock is communicated by pill + dim scrim only.
      '.twk-gated{position:relative}',
      '.twk-gated .vthumb img, .twk-gated .vthumb video, .twk-gated .thumb img, .twk-gated img.thumb{filter:saturate(.95) brightness(.82)!important;transition:filter .3s}',
      '.twk-gated:hover .vthumb img, .twk-gated:hover .vthumb video, .twk-gated:hover .thumb img, .twk-gated:hover img.thumb{filter:saturate(1) brightness(.92)!important}',
      '.twk-gated::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.55) 100%);pointer-events:none;z-index:2;border-radius:inherit}',
      '.twk-lock-pill{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:5;padding:9px 16px;border-radius:999px;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,180,84,.55);color:#fff;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;pointer-events:none;opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.2,1.2,.3,1);white-space:nowrap;box-shadow:0 10px 28px rgba(0,0,0,.5)}',
      '.twk-gated:hover .twk-lock-pill{opacity:1;transform:translate(-50%,-50%) scale(1.04)}',
      '.twk-free-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:rgba(30,224,143,.14);border:1px solid rgba(30,224,143,.4);color:#1ee08f;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-left:8px;vertical-align:middle}',
      '.twk-free-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:#1ee08f;box-shadow:0 0 8px #1ee08f}',
      // Modal
      '.twk-modal{position:fixed;inset:0;z-index:10000;background:rgba(3,3,8,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:none;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .25s}',
      '.twk-modal.open{display:flex;opacity:1}',
      '.twk-modal-box{width:min(520px,100%);background:linear-gradient(180deg,rgba(20,20,32,.98),rgba(10,10,20,.98));border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:36px 32px;box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 60px rgba(255,45,135,.15);position:relative;color:#f5f5fb;font-family:"Inter",ui-sans-serif,system-ui,sans-serif}',
      '.twk-modal-box::before{content:"";position:absolute;top:-1px;left:-1px;right:-1px;height:3px;border-radius:24px 24px 0 0;background:linear-gradient(90deg,#ff2d87,#9d4edd,#ffb454)}',
      '.twk-modal-close{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.4);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s}',
      '.twk-modal-close:hover{background:rgba(255,45,135,.3);border-color:#ff2d87}',
      '.twk-kicker{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:#ff6fa8;margin-bottom:14px;display:flex;align-items:center;gap:8px}',
      '.twk-kicker::before{content:"";width:22px;height:1px;background:#ff2d87}',
      '.twk-modal h2{font-family:"Playfair Display",Georgia,serif;font-size:28px;font-weight:900;line-height:1.1;margin-bottom:14px;letter-spacing:-.01em}',
      '.twk-modal h2 em{font-style:italic;background:linear-gradient(135deg,#ff2d87,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.twk-modal p{color:#c7c7d3;line-height:1.65;margin-bottom:14px;font-size:15px}',
      '.twk-modal p b{color:#ff6fa8;font-weight:800}',
      '.twk-fomo{margin:14px 0 20px;padding:12px 14px;border-radius:14px;background:linear-gradient(90deg,rgba(255,45,135,.12),rgba(157,78,221,.12));border-left:3px solid #ff2d87;color:#ffd8ea;font-family:"Playfair Display",Georgia,serif;font-size:16px}',
      '.twk-fomo em{font-style:italic;font-weight:700}',
      '.twk-list{list-style:none;padding:0;margin:0 0 22px;display:flex;flex-direction:column;gap:8px}',
      '.twk-list li{padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);color:#e0e0ec;font-size:13.5px;display:flex;align-items:center;gap:10px}',
      '.twk-list li::before{content:"★";color:#ffb454;font-size:13px}',
      '.twk-form{display:flex;flex-direction:column;gap:10px;margin-bottom:18px}',
      '.twk-form input{padding:13px 15px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s,background .2s}',
      '.twk-form input:focus{border-color:#ff6fa8;background:rgba(255,255,255,.06)}',
      '.twk-form input::placeholder{color:#7a7a8a}',
      '.twk-cta{display:block;width:100%;padding:15px 20px;border-radius:14px;border:0;background:linear-gradient(135deg,#ff2d87,#9d4edd);color:#fff;font-family:inherit;font-weight:900;font-size:14px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:transform .25s cubic-bezier(.2,1.2,.3,1),box-shadow .25s;box-shadow:0 10px 28px rgba(255,45,135,.35)}',
      '.twk-cta:hover{transform:translateY(-2px);box-shadow:0 16px 40px rgba(255,45,135,.5)}',
      '.twk-cta.gold{background:linear-gradient(135deg,#ffb454,#ff2d87);box-shadow:0 10px 28px rgba(255,180,84,.4)}',
      '.twk-alt{text-align:center;margin-top:12px;font-size:12px;color:#8c8ca0}',
      '.twk-alt a{color:#ff6fa8;font-weight:700;cursor:pointer;text-decoration:underline}',
      '.twk-mono-sub{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#8c8ca0;text-align:center;margin-top:14px}',
      // Gated-hero banner (non-subscribed users only) above the grid
      '.twk-gated-hero{margin:18px auto 8px;padding:18px 22px;border-radius:18px;background:linear-gradient(90deg,rgba(255,45,135,.14),rgba(157,78,221,.14));border:1px solid rgba(255,45,135,.3);color:#ffd8ea;text-align:left;box-shadow:inset 0 0 40px rgba(255,45,135,.06)}',
      '.twk-gated-hero h3{font-family:"Playfair Display",Georgia,serif;font-size:clamp(22px,3vw,30px);font-weight:800;line-height:1.15;letter-spacing:-.01em;margin:0 0 6px;color:#fff}',
      '.twk-gated-hero h3 em{font-style:italic;background:linear-gradient(135deg,#ff2d87,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}',
      '.twk-gated-hero p{font-family:"Inter",sans-serif;font-size:14px;line-height:1.5;color:#e7c8d8;margin:0}',
      // Rotating FOMO pill strip
      '.twk-fomo-strip{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;margin:16px auto 0;padding:0 22px;max-width:1100px;min-height:32px}',
      '.twk-fomo-pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,45,135,.35);color:#ffd8ea;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;transition:opacity .55s ease,transform .55s ease;opacity:0;transform:translateY(5px)}',
      '.twk-fomo-pill.live{border-color:rgba(30,224,143,.45);color:#b9f6d4}',
      '.twk-fomo-pill.gold{border-color:rgba(255,180,84,.45);color:#ffe1b3}',
      '.twk-fomo-pill.is-in{opacity:1;transform:translateY(0)}',
      '@media (max-width:520px){.twk-modal-box{padding:28px 22px}.twk-modal h2{font-size:24px}}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  // ───────── Modal ─────────
  function ensureModal(){
    var m = document.getElementById(MODAL_ID);
    if (m) return m;
    m = document.createElement('div');
    m.id = MODAL_ID;
    m.className = 'twk-modal';
    m.setAttribute('role','dialog');
    m.setAttribute('aria-modal','true');
    m.innerHTML = '<div class="twk-modal-box" role="document"><button class="twk-modal-close" type="button" aria-label="Close">×</button><div class="twk-modal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(ev){ if (ev.target === m) close(); });
    m.querySelector('.twk-modal-close').addEventListener('click', close);
    document.addEventListener('keydown', function(ev){
      if (ev.key === 'Escape' && m.classList.contains('open')) close();
    });
    return m;
  }
  function close(){
    var m = document.getElementById(MODAL_ID);
    if (!m) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
  function open(renderFn){
    var m = ensureModal();
    var body = m.querySelector('.twk-modal-body');
    body.innerHTML = '';
    renderFn(body);
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function renderRegister(body){
    body.innerHTML = [
      '<div class="twk-kicker">/ ', COPY.tagline, '</div>',
      '<h2>', COPY.registerTitle, '</h2>',
      '<p>', COPY.registerPitch, '</p>',
      '<div class="twk-fomo">', randomFrom(COPY.registerFomoPool), '</div>',
      '<form class="twk-form" id="twk-register-form">',
      '  <input type="text" name="name" placeholder="Nombre" autocomplete="name" required>',
      '  <input type="email" name="email" placeholder="Email" autocomplete="email" required>',
      '  <input type="password" name="password" placeholder="Contraseña (mín. 6)" autocomplete="new-password" minlength="6" required>',
      '</form>',
      '<button type="submit" form="twk-register-form" class="twk-cta">', COPY.registerCTA, ' →</button>',
      '<div class="twk-mono-sub">', COPY.taglineMono, '</div>',
      '<div class="twk-alt">¿Ya tenés cuenta? <a data-twk-switch="login">', COPY.subscribeAltCTA, '</a></div>'
    ].join('');
    var form = body.querySelector('#twk-register-form');
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var data = {};
      Array.prototype.forEach.call(form.elements, function(el){ if (el.name) data[el.name] = el.value; });
      writeAuth({ registered:true, subscribed:false, email: data.email || '' });
      setTimeout(function(){ open(renderSubscribe); }, 200);
    });
    var sw = body.querySelector('[data-twk-switch="login"]');
    if (sw) sw.addEventListener('click', function(){
      writeAuth({ registered:true, subscribed:false, email:'' });
      setTimeout(function(){ open(renderSubscribe); }, 200);
    });
  }

  function renderSubscribe(body){
    var lis = COPY.subscribeList.map(function(x){ return '<li>'+x+'</li>'; }).join('');
    body.innerHTML = [
      '<div class="twk-kicker">/ ', COPY.tagline, ' · USD 9.99 / mes</div>',
      '<h2>', randomFrom(COPY.subscribeHeadlines), '</h2>',
      '<p>', randomFrom(COPY.subscribePitchPool), '</p>',
      '<ul class="twk-list">', lis, '</ul>',
      '<div class="twk-fomo">', randomFrom(COPY.registerFomoPool), '</div>',
      '<button type="button" class="twk-cta gold" id="twk-subscribe-cta">', COPY.subscribeCTA, ' →</button>',
      '<div class="twk-mono-sub">', COPY.subscribeFooter, '</div>',
      '<div class="twk-alt"><a data-twk-mark-sub>', COPY.subscribeAltCTA, '</a></div>'
    ].join('');
    body.querySelector('#twk-subscribe-cta').addEventListener('click', function(){
      writeAuth({ registered:true, subscribed:true, email: state.email || '' });
      close();
    });
    var al = body.querySelector('[data-twk-mark-sub]');
    if (al) al.addEventListener('click', function(){
      writeAuth({ registered:true, subscribed:true, email: state.email || '' });
      close();
    });
  }

  // ───────── Gate application ─────────
  function isHotRankItem(el){
    if (!el) return false;
    if (el.classList && el.classList.contains('rk-item')) return true;
    if (el.closest && el.closest('.hotrank, .rk-list, [data-hot-ranking]')) return true;
    return false;
  }
  function isGatableCard(el){
    if (!el) return false;
    if (isHotRankItem(el)) return false;
    // Typical playlist card selectors
    if (el.classList && (el.classList.contains('vcard') || el.classList.contains('preview-card') || el.classList.contains('playlist-card') || el.classList.contains('grid-card'))) return true;
    // Fallback: anything with data-vid
    if (el.hasAttribute && el.hasAttribute('data-vid')) return true;
    return false;
  }

  function applyGates(){
    state = readAuth();
    var unlocked = !!state.subscribed;
    var cards = document.querySelectorAll('.vcard, .preview-card, .playlist-card, .grid-card, [data-vid]');
    for (var i = 0; i < cards.length; i++){
      var c = cards[i];
      if (!isGatableCard(c) || isHotRankItem(c)) continue;
      if (unlocked){
        c.classList.remove('twk-gated');
        var old = c.querySelector('.twk-lock-pill');
        if (old) old.remove();
      } else {
        if (!c.classList.contains('twk-gated')){
          c.classList.add('twk-gated');
          var pill = document.createElement('div');
          pill.className = 'twk-lock-pill';
          // Rotate the hover lock copy per card so the page doesn't feel
          // like it's repeating the same line on every thumbnail.
          pill.textContent = randomFrom(COPY.hoverLockPool);
          c.appendChild(pill);
        }
      }
    }
    // Decorate Hot Ranking headers with a "Free preview" badge (once)
    var rkHeads = document.querySelectorAll('.hotrank .rk-head, .hot-ranking .rk-head, [data-hot-ranking] .rk-head');
    for (var j = 0; j < rkHeads.length; j++){
      var h = rkHeads[j];
      if (h.querySelector('.twk-free-badge')) continue;
      var b = document.createElement('span');
      b.className = 'twk-free-badge';
      b.textContent = COPY.freePreviewBadge;
      h.appendChild(b);
    }
    // Inject the "gated hero" banner above the main grid for non-subs.
    if (!unlocked){
      injectGatedHero();
    } else {
      var old = document.querySelector('.twk-gated-hero');
      if (old) old.remove();
    }
  }

  function injectGatedHero(){
    if (document.querySelector('.twk-gated-hero')) return;
    // Find the first grid that contains gatable cards.
    var grid = document.querySelector('.grid, .video-grid, [data-video-grid]');
    if (!grid) return;
    var bn = document.createElement('div');
    bn.className = 'twk-gated-hero';
    bn.innerHTML = [
      '<h3>', COPY.gatedHeroLine, '</h3>',
      '<p>', COPY.gatedHeroSub, '</p>'
    ].join('');
    grid.parentNode.insertBefore(bn, grid);
  }

  // Rotating FOMO pill strip — appears just below the hero; cycles every 4s.
  function installFomoStrip(){
    state = readAuth();
    if (state.subscribed) return; // no pressure for paying users
    if (document.querySelector('.twk-fomo-strip')) return;
    var grid = document.querySelector('.grid, .video-grid, [data-video-grid]');
    if (!grid) return;
    var strip = document.createElement('div');
    strip.className = 'twk-fomo-strip';
    strip.innerHTML = [
      '<span class="twk-fomo-pill" data-role="fomo"></span>',
      '<span class="twk-fomo-pill live" data-role="live"></span>',
      '<span class="twk-fomo-pill gold" data-role="gold"></span>'
    ].join('');
    grid.parentNode.insertBefore(strip, grid);

    var pillFomo = strip.querySelector('[data-role="fomo"]');
    var pillLive = strip.querySelector('[data-role="live"]');
    var pillGold = strip.querySelector('[data-role="gold"]');

    function setPill(el, text){
      if (!el) return;
      el.classList.remove('is-in');
      setTimeout(function(){
        el.textContent = text;
        requestAnimationFrame(function(){ el.classList.add('is-in'); });
      }, 220);
    }
    function liveNum(){
      // Seeded-ish pseudo-live counter so two back-to-back calls don't scream
      var base = 180 + Math.floor(Math.random()*240);
      return base.toLocaleString();
    }
    function tick(){
      setPill(pillFomo, randomFrom(COPY.fomoPillPool));
      setPill(pillLive, randomFrom(COPY.livePool).replace('%N', liveNum()));
      setPill(pillGold, 'USD 9.99 / mes · cancel anytime');
    }
    tick();
    setInterval(tick, 4200);
  }

  // Capture-phase click handler → intercepts gated-card clicks before
  // the native modal (YouTube embed) opens.
  function onClickCapture(ev){
    var target = ev.target;
    if (!target) return;
    var card = target.closest && target.closest('.vcard, .preview-card, .playlist-card, .grid-card, [data-vid]');
    if (!card) return;
    if (isHotRankItem(card)) return;
    var auth = readAuth();
    if (auth.subscribed) return;   // all access
    // Block the default action and route to the correct modal
    ev.stopPropagation();
    ev.preventDefault();
    if (!auth.registered){
      open(renderRegister);
    } else {
      open(renderSubscribe);
    }
  }

  function boot(){
    injectStyles();
    ensureModal();
    applyGates();
    installFomoStrip();
    document.addEventListener('click', onClickCapture, true);
    // Keep the gates in sync if cards are injected after load (e.g. JS-built grids).
    // Debounced so mass MutationObserver fires don't thrash the DOM.
    if (window.MutationObserver){
      var pending = false;
      var mo = new MutationObserver(function(){
        if (pending) return;
        pending = true;
        setTimeout(function(){
          pending = false;
          applyGates();
          installFomoStrip();
        }, 150);
      });
      mo.observe(document.body, { childList:true, subtree:true });
    }
    // Re-run when auth changes
    document.addEventListener('twerkhub-auth-change', function(){
      applyGates();
      installFomoStrip();
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.TwerkhubPaywall = {
    open: function(mode){ open(mode === 'subscribe' ? renderSubscribe : renderRegister); },
    close: close,
    getAuth: readAuth,
    setAuth: writeAuth,
    applyGates: applyGates,
    COPY: COPY
  };
})();
