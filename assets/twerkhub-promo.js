/* Gift-price banner + live prices while the owner-started promotion is active (auto-expires). */
(function () {
  fetch('/api/jenny/promo', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (p) {
    if (!p || !p.active) return;
    var end = p.ends_at, skew = p.now - Date.now();
    var bar = document.createElement('div'); bar.id = 'gift';
    bar.setAttribute('style', 'position:sticky;top:0;z-index:60;display:flex;gap:14px;align-items:center;justify-content:center;flex-wrap:wrap;padding:10px 16px;background:linear-gradient(90deg,#1a0f00,#3a2300,#1a0f00);border-bottom:1px solid #ffbe70;color:#fff1d0;font:700 15px Rajdhani,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;text-align:center;box-shadow:0 0 24px rgba(255,138,0,.45)');
    bar.innerHTML = '<span style="color:#ffb347">Gift prices</span><span>Every video 1 coin · only $0.50 · buy from $1</span><span id="giftT" style="font-variant-numeric:tabular-nums;color:#fff"></span><span style="opacity:.75;text-transform:none;letter-spacing:.04em;font-size:13px">Precios de regalo: todo a 1 moneda, compra desde $1</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    function tick() { var s = Math.max(0, Math.floor((end - (Date.now() + skew)) / 1000)); if (!s) { bar.remove(); return; } var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; document.getElementById('giftT').textContent = 'ends in ' + h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }
    tick(); setInterval(tick, 1000);
    document.querySelectorAll('.c[data-cost]').forEach(function (c) { c.dataset.cost = '1'; c.querySelectorAll('.full').forEach(function (b) { b.childNodes.forEach(function (n) { if (n.nodeType === 3) n.textContent = n.textContent.replace(/\d+ coins?/, '1 coin'); }); }); });
    document.querySelectorAll('.pc li').forEach(function (li) { if (/Minimum purchase/.test(li.textContent)) li.lastChild.textContent = ' Minimum purchase: 2 coins ($1) · gift prices'; });
  }).catch(function () {});
})();
