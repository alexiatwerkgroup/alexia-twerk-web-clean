/*!
 * ALEXIA TWERK — Global counters (total videos + already watched)
 * Master Directive nro 1 · Puntos 3, 7 del punch list.
 *
 * Exponer:
 *   window.ALEXIA_TOTAL_VIDEOS    — suma REAL de /playlist/ + /playlist-2/
 *   window.alexiaAlreadyWatched() — formula (300-400 random por dia) x dias x 2
 *
 * Side-effects:
 *   - Actualiza todo elemento marcado con:
 *       [data-stat-total-videos], .alexia-total-videos, #alexia-total-videos
 *     con el total real.
 *   - Actualiza todo elemento marcado con:
 *       [data-stat-already-watched], .alexia-already-watched, #alexia-already-watched
 *     con el counter que crece cada 10 min + tween de color.
 *   - Si existe #stat-videos o #stat-views (playlist-2 legacy) tambien los pisa.
 */
(function(){
  'use strict';
  if (window.__alexiaCountersMountedV1) return;
  window.__alexiaCountersMountedV1 = true;

  // ── Totals (snapshot 2026-04-18) ─────────────────────────────
  // /playlist/ = 315 HTML pages, /playlist-2/ data.js = 275 videos
  // Total real = 590. Cuando cambie el numero de videos, solo editar aqui.
  var TOTAL_PLAYLIST = 315;
  var TOTAL_PLAYLIST_2 = 275;
  var TOTAL_VIDEOS = TOTAL_PLAYLIST + TOTAL_PLAYLIST_2; // 590
  window.ALEXIA_TOTAL_VIDEOS = TOTAL_VIDEOS;

  // ── Already Watched formula ──────────────────────────────────
  // Launch real del portal: 10 de marzo de 2026.
  // Formula: por cada dia desde launch, entre 300 y 400 personas vieron.
  // Cada persona mira ~2 videos (playlist + playlist-2) = multiplicador 2.
  var LAUNCH = new Date('2026-03-10T00:00:00');
  var MULTIPLIER = 2;

  function seededRand(seed){ var x = Math.sin(seed) * 10000; return x - Math.floor(x); }

  function computeAlreadyWatched(){
    var now = new Date();
    var todaySeed = Math.floor(now.getTime() / 86400000);
    var daysSinceLaunch = Math.max(1, Math.floor((now - LAUNCH) / 86400000));

    function dailyAmount(daysAgo){
      return (300 + Math.floor(seededRand(todaySeed - daysAgo) * 100)) * MULTIPLIER;
    }
    var total = 0;
    for (var d = 1; d < daysSinceLaunch; d++) total += dailyAmount(d);

    // Intra-day: escalado por fraccion del dia transcurrida
    var hourFrac = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
    total += Math.floor(dailyAmount(0) * hourFrac);
    return total;
  }
  window.alexiaAlreadyWatched = computeAlreadyWatched;

  function formatBig(n){
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/,'') + 'M';
    if (n >= 10000)   return Math.floor(n / 1000) + 'K';
    if (n >= 1000)    return (n / 1000).toFixed(1).replace(/\.0$/,'') + 'K';
    return String(n);
  }

  // ── DOM application ──────────────────────────────────────────
  var TOTAL_SELECTORS = [
    '[data-stat-total-videos]',
    '.alexia-total-videos',
    '#alexia-total-videos'
  ].join(',');
  var WATCHED_SELECTORS = [
    '[data-stat-already-watched]',
    '.alexia-already-watched',
    '#alexia-already-watched'
  ].join(',');

  function applyTotals(){
    document.querySelectorAll(TOTAL_SELECTORS).forEach(function(el){
      el.textContent = String(TOTAL_VIDEOS);
    });
    var watched = computeAlreadyWatched();
    var watchedText = formatBig(watched);
    document.querySelectorAll(WATCHED_SELECTORS).forEach(function(el){
      var prev = el.textContent;
      if (prev === watchedText) return;
      el.textContent = watchedText;
      // tween color si ya existia un valor
      if (prev && prev !== '—' && prev !== '0') {
        el.style.transition = 'color .5s, text-shadow .5s';
        var prior = el.style.color;
        el.style.color = '#ff6fa8';
        el.style.textShadow = '0 0 20px rgba(255,111,168,.7)';
        setTimeout(function(){
          el.style.color = prior || '';
          el.style.textShadow = '';
        }, 1100);
      }
    });
    // Compat con Playlist-2 legacy (#stat-videos / #stat-views)
    var sv = document.getElementById('stat-videos');
    if (sv && !sv.__alexiaTouched) {
      sv.textContent = String(TOTAL_VIDEOS);
      sv.__alexiaTouched = true;
    }
    var sw = document.getElementById('stat-views');
    if (sw) sw.textContent = watchedText;
  }

  function run(){
    applyTotals();
    // Re-aplica cada 10 minutos (match con playlist-2 cadence)
    setInterval(applyTotals, 10 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
