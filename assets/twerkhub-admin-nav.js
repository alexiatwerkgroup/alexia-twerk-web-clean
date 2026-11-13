/* Admin pages use the SAME universal header as the whole site (shell v2). Admin links live in the profile menu. */
(function () {
  function put() {
    var old = document.getElementById('twk-nav-container'); if (old) old.remove();
    document.querySelectorAll('footer.twk-mf').forEach(function (f) { f.remove(); });
    if (!document.querySelector('link[href*="twk-shell-v2.css"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/twk-shell-v2.css?v=1'; document.head.appendChild(l); }
    if (!document.querySelector('header.tn2')) {
      var h = document.createElement('header'); h.className = 'tn2';
      h.innerHTML = '<div class="tn2-w"><a class="tn2-logo" href="/" aria-label="Twerkhub home">TWERK<b>HUB</b></a><div class="tn2-lk"><a href="/#playlists">Playlists</a><a href="/creators">Creators</a><a href="/membership">Membership</a><a href="/account">My account</a><a class="tn2-jn" href="/jenny/">Jenny VIP</a></div></div>';
      document.body.insertBefore(h, document.body.firstChild);
    }
    [['/assets/twk-stats-btn.js?v=20261113-pt1'], ['/assets/twerkhub-activity.js?v=2']].forEach(function (s) { if (!document.querySelector('script[src^="' + s[0].split('?')[0] + '"]')) { var e = document.createElement('script'); e.src = s[0]; e.defer = true; document.head.appendChild(e); } });
  }
  if (document.body) put(); else document.addEventListener('DOMContentLoaded', put);
})();
