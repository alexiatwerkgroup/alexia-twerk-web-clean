/*!
 * TWERKHUB · Universal Playlist Renderer — anonymised
 * --------------------------------------------------------------
 * NEW RULE (Anti 2026-04-20): no video ever shows its real title or
 * channel. Every card is labeled #001, #002 … regardless of whether
 * it's hot ranking or paywall-gated. The user experiences all videos
 * as exclusive Twerkhub content even when the upstream source is a
 * public YouTube playlist. Titles/channels are kept server-side only.
 *
 *   · Hot Ranking (top 5) — thumb SHARP, NO blur, rank badge visible
 *     (gold #1, purple #2, pink #3, monochrome #4/#5), "💎 private ·
 *     not on YouTube" FOMO pill on every card, click opens embed.
 *   · Grid (rest) — thumb BLURRED via paywall CSS, "🔒 USD 9.99" pill,
 *     click opens the Register → Subscribe modal. After subscribing,
 *     the grid re-renders with the real thumb (still no title/channel).
 *
 * The card DOM matches the .vcard pattern used in the new playlists,
 * so the paywall module's `.twk-gated` CSS (blur + lock pill + modal)
 * applies automatically.
 *
 * Persistent FOMO banner injected above every grid reminds the visitor
 * "Private archive · not on YouTube · weekly drops · N members watching".
 *
 * Version: 2026-04-20-b · anonymised
 */
(function(){
  'use strict';
  if (window.TwerkhubPlaylistRenderer) return;

  // ── Mapping: URL path → playlist data filename ──
  var MAP = {
    '/playlist-corean':         'corean',
    '/playlist-corean.html':    'corean',
    '/playlist-cosplay':        'cosplay',
    '/playlist-cosplay.html':   'cosplay',
    '/playlist-try-on':         'try-on',
    '/playlist-try-on.html':    'try-on',
    '/playlist-ttl':            'ttl',
    '/playlist-ttl.html':       'ttl',
    '/playlist-twerk-hub':      'twerk-hub',
    '/playlist-twerk-hub.html': 'twerk-hub',
    '/playlist-del-otro-lado':  'del-otro-lado',
    '/playlist-del-otro-lado.html': 'del-otro-lado'
  };

  function detectPlaylist(){
    var p = (location.pathname || '').replace(/\/$/, '').toLowerCase();
    if (MAP[p]) return MAP[p];
    // Body attribute override
    if (document.body && document.body.dataset && document.body.dataset.playlist) return document.body.dataset.playlist;
    return null;
  }

  function isSubscribed(){
    try {
      var a = JSON.parse(localStorage.getItem('twerkhub_auth') || '{}');
      return !!a.subscribed;
    } catch(_){ return false; }
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  // b64 obfuscator — same shape used in JSONs (base64url + sha256 tag).
  // Used for hot cards that still need a clickable real id on the client.
  function b64enc(s){
    try { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
    catch(_){ return ''; }
  }

  // Suggestive tagline lookup — deterministic per video id via the
  // external TwerkhubTitles module (pool of 37 SFW-safe adjectives).
  // Falls back to a built-in mini-pool if the module hasn't loaded yet.
  var FALLBACK_POOL = ['Atrevido','Sugerente','Íntimo','Privado','Exclusivo','Provocador','Sensual','Travieso'];
  function taglineFor(seed){
    var api = window.TwerkhubTitles;
    if (api && typeof api.taglineFor === 'function') return api.taglineFor(seed || '');
    var h = 0, s = String(seed || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    return FALLBACK_POOL[h % FALLBACK_POOL.length];
  }

  function buildHotCard(item, number){
    // NO real title/channel ever. Just: number + suggestive tagline +
    // rank badge + FOMO pill.  Tagline is deterministic per video id.
    var a = document.createElement('a');
    a.className = 'vcard reveal';
    a.href = '#';
    a.setAttribute('data-vid', item.id);
    a.setAttribute('data-v', b64enc(item.id));
    a.setAttribute('data-hot', '1');
    a.setAttribute('data-number', number);
    var badgeCls = 'rank-badge ' + (item.badge || 'monochrome');
    var rankText = '#' + String(item.rank || 1).padStart(2,'0');
    var dur = item.duration ? '<span class="video-duration">'+esc(item.duration)+'</span>' : '';
    var tag = esc(taglineFor(item.id || number));
    a.innerHTML = [
      '<div class="vthumb">',
      '  <img src="https://i.ytimg.com/vi/', esc(item.id), '/maxresdefault.jpg" alt="', esc(number), '" loading="lazy" onerror="this.src=\'https://i.ytimg.com/vi/', esc(item.id), '/hqdefault.jpg\'">',
      '  <div class="vscrim"></div>',
      '  <div class="', badgeCls, '">', rankText, '</div>',
      '  <div class="fomo-pill">💎 private · not on YouTube</div>',
      '  <div class="vplay"></div>',
      '</div>',
      '<div class="card-meta vmeta">',
      '  <span class="video-number vtitle">', esc(number), '</span>',
      '  <span class="video-tagline">· ', tag, '</span>',
      '  ', dur,
      '</div>'
    ].join('');
    return a;
  }

  function buildGatedCard(item, subscribed){
    var a = document.createElement('a');
    a.className = 'vcard reveal';
    a.href = '#';
    a.setAttribute('data-v', item.hidden_id || '');
    if (subscribed) a.setAttribute('data-vid', item._id);
    var number = esc(item.number || '');
    var dur = item.duration ? '<span class="video-duration">'+esc(item.duration)+'</span>' : '';
    // Anti 2026-04-20: thumbnails are ALWAYS sharp (no blur). The lock is
    // communicated by the floating pill + dim overlay only. Use the real
    // YouTube thumbnail in every case so the grid looks full and premium.
    var thumbId = item._id || '';
    var thumbSrc = thumbId
      ? 'https://i.ytimg.com/vi/'+encodeURIComponent(thumbId)+'/hqdefault.jpg'
      : '/safe-adult-placeholder.svg';
    // Seed tagline on the obfuscated id so it stays stable even when the
    // real id isn't yet exposed to the client (non-subscribers).
    var tag = esc(taglineFor(item._id || item.hidden_id || number));
    a.innerHTML = [
      '<div class="vthumb">',
      '  <img src="', thumbSrc, '" alt="', number, '" loading="lazy"',
      thumbId ? ' onerror="this.src=\'/safe-adult-placeholder.svg\'"' : '',
      '>',
      '  <div class="vscrim"></div>',
      '  <div class="fomo-pill">💎 private · not on YouTube</div>',
      subscribed
        ? '  <div class="rank-badge unlocked">'+number+'</div>'
        : '  <div class="lock-overlay">🔒 '+number+' · USD 9.99/mes</div>',
      '  <div class="vplay"></div>',
      '</div>',
      '<div class="card-meta vmeta">',
      '  <span class="video-number vtitle">', number, '</span>',
      '  <span class="video-tagline">· ', tag, '</span>',
      '  ', dur,
      '</div>'
    ].join('');
    return a;
  }

  function buildHotItem(item, number){
    // Hot ranking sidebar item — number + tagline + duration + rank medal.
    // No real title, no channel.
    var a = document.createElement('a');
    a.className = 'rk-item';
    a.href = '#';
    a.setAttribute('data-vid', item.id);
    a.setAttribute('data-hot', '1');
    a.setAttribute('data-number', number);
    var rankText = '#' + String(item.rank || 1).padStart(2,'0');
    var tag = esc(taglineFor(item.id || number));
    a.innerHTML = [
      '<div class="rk-num ' + (item.badge || 'monochrome') + '">', rankText, '</div>',
      '<div class="rk-copy">',
      '  <div class="rk-title">', esc(number), ' · <span class="video-tagline">', tag, '</span></div>',
      '  <div class="rk-sub">', (item.duration ? esc(item.duration) + ' · ' : ''), 'private · not on YouTube', '</div>',
      '</div>'
    ].join('');
    return a;
  }

  function mountEmbedModal(){
    if (document.getElementById('twk-embed-modal')) return;
    var m = document.createElement('div');
    m.id = 'twk-embed-modal';
    m.className = 'embed-modal';
    m.setAttribute('role','dialog');
    m.setAttribute('aria-modal','true');
    m.innerHTML = '<div class="embed-box"><button class="embed-close" type="button">Close ×</button><iframe id="twk-embed-frame" src="" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>';
    document.body.appendChild(m);
    var frame = m.querySelector('#twk-embed-frame');
    function shut(){ m.classList.remove('open'); frame.src = ''; document.body.style.overflow = ''; }
    m.querySelector('.embed-close').addEventListener('click', shut);
    m.addEventListener('click', function(ev){ if (ev.target === m) shut(); });
    document.addEventListener('keydown', function(ev){ if (ev.key === 'Escape' && m.classList.contains('open')) shut(); });
  }
  function openEmbed(vid){
    mountEmbedModal();
    var m = document.getElementById('twk-embed-modal');
    var frame = document.getElementById('twk-embed-frame');
    frame.src = 'https://www.youtube.com/embed/'+encodeURIComponent(vid)+'?autoplay=1&rel=0&modestbranding=1';
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function mountFomoBanner(gridEl){
    if (!gridEl || document.querySelector('.twk-playlist-fomo')) return;
    var bn = document.createElement('div');
    bn.className = 'twk-playlist-fomo';
    var n = 180 + Math.floor(Math.random()*240);
    bn.innerHTML = [
      '<div class="twk-fomo-line">Private archive · not on YouTube · weekly drops</div>',
      '<div class="twk-fomo-sub">Curated by Twerkhub · exclusive to members · <strong data-live>',
      n.toLocaleString(), '</strong> members watching now</div>'
    ].join('');
    gridEl.parentNode.insertBefore(bn, gridEl);
    // Gently tick the counter
    setInterval(function(){
      var el = bn.querySelector('[data-live]');
      if (!el) return;
      var cur = parseInt(el.textContent.replace(/\D/g,''), 10) || n;
      var delta = Math.round((Math.random()-.5)*14);
      var next = Math.max(60, Math.min(520, cur + delta));
      el.textContent = next.toLocaleString();
    }, 4200);
  }

  function render(data){
    if (!data) return;
    var gridEl   = document.getElementById('video-grid')  || document.querySelector('[data-video-grid]');
    var hotListEl = document.getElementById('hotrank-list') || document.querySelector('[data-hot-ranking] .rk-list, .hotrank .rk-list');
    var subscribed = isSubscribed();
    var hot = Array.isArray(data.hot_ranking) ? data.hot_ranking : [];
    var grid = Array.isArray(data.grid) ? data.grid : [];

    if (gridEl){
      gridEl.innerHTML = '';
      mountFomoBanner(gridEl);
      var frag = document.createDocumentFragment();
      for (var i = 0; i < hot.length; i++){
        var num = '#' + String(i + 1).padStart(3, '0');
        frag.appendChild(buildHotCard(hot[i], num));
      }
      for (var j = 0; j < grid.length; j++){
        // Grid JSONs already carry "number" starting at #006, but we override
        // to keep continuity with hot (#001..#005, then #006+ for grid).
        var g = grid[j];
        if (!g.number) g.number = '#' + String(hot.length + j + 1).padStart(3, '0');
        frag.appendChild(buildGatedCard(g, subscribed));
      }
      gridEl.appendChild(frag);
    }
    if (hotListEl){
      hotListEl.innerHTML = '';
      var fragR = document.createDocumentFragment();
      for (var k = 0; k < hot.length; k++){
        var numR = '#' + String(k + 1).padStart(3, '0');
        fragR.appendChild(buildHotItem(hot[k], numR));
      }
      hotListEl.appendChild(fragR);
    }

    // Click handler — only hot items open the embed directly. Gated items
    // are routed to the paywall modal by paywall.js (capture phase).
    document.addEventListener('click', function(ev){
      var a = ev.target.closest && ev.target.closest('[data-hot="1"]');
      if (!a) return;
      var vid = a.getAttribute('data-vid');
      if (!vid) return;
      ev.preventDefault();
      openEmbed(vid);
    });

    // If subscribed, also wire gated cards to open real embed using _id (was
    // written into data-vid when building the card for subs).
    if (subscribed){
      document.addEventListener('click', function(ev){
        var a = ev.target.closest && ev.target.closest('[data-v]');
        if (!a) return;
        var vid = a.getAttribute('data-vid');
        if (!vid) return;
        ev.preventDefault();
        openEmbed(vid);
      });
    }

    // Re-render automatically when auth changes (subscribe unlocks the grid)
    document.addEventListener('twerkhub-auth-change', function(){ render(data); }, { once: true });
  }

  function boot(){
    var name = detectPlaylist();
    if (!name) return; // not a known playlist page
    fetch('/assets/'+name+'-videos.json', { credentials: 'same-origin', cache: 'no-cache' })
      .then(function(r){ if (!r.ok) throw new Error('fetch '+r.status); return r.json(); })
      .then(function(data){ render(data); })
      .catch(function(err){ console.warn('[twerkhub-playlist]', 'load failed for', name, err && err.message); });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.TwerkhubPlaylistRenderer = { render: render, detectPlaylist: detectPlaylist };
})();
