/* Header "Jenny VIP" -> dropdown with all models. Same on every page. */
(function () {
  if (window.__twkModels) return; window.__twkModels = 1;
  var st = document.createElement('style');
  st.textContent = '.tn2-mdd{position:relative;display:inline-flex}.tn2-mdd>button{cursor:pointer}.tn2-mdp{display:none;position:absolute;right:0;top:calc(100% + 10px);min-width:240px;background:#0b0a07;border:1px solid #3a2a10;border-radius:14px;padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.6);z-index:300}.tn2-mdd.open .tn2-mdp{display:block}.tn2-mdp a{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:9px;color:#e9dfc0;text-decoration:none;font:700 12px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.tn2-mdp a:hover{background:#1a0f00;color:#ffb03a}.tn2-mdp a small{color:#8a7a55;font-size:10px}';
  document.head.appendChild(st);
  var M = [['Jenny', '/jenny/', 'live'], ['Abbi', '/#roster', 'soon'], ['Tainara', '/#roster', 'soon'], ['Vegan', '/#roster', 'soon'], ['Camila', '/#roster', 'soon'], ['Alexia', '/#roster', 'live']];
  function run() {
    var a = document.querySelector('.tn2-lk a.tn2-jn'); if (!a || a.parentNode.classList.contains('tn2-mdd')) return;
    var w = document.createElement('span'); w.className = 'tn2-mdd';
    var b = document.createElement('button'); b.type = 'button'; b.className = a.className; b.setAttribute('aria-expanded', 'false');
    b.textContent = 'Jenny VIP ▾';
    var p = document.createElement('div'); p.className = 'tn2-mdp';
    p.innerHTML = M.map(function (m) { return '<a href="' + m[1] + '">' + m[0] + '<small>' + (m[2] === 'live' ? 'LIVE' : 'SOON') + '</small></a>'; }).join('');
    w.appendChild(b); w.appendChild(p);
    a.parentNode.replaceChild(w, a);
    b.addEventListener('click', function (e) { e.stopPropagation(); w.classList.toggle('open'); b.setAttribute('aria-expanded', w.classList.contains('open')); });
    document.addEventListener('click', function () { w.classList.remove('open'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  setTimeout(run, 900);
})();
