/* Icon style picker (3D / gold medallion / crystal). Lives in the IA menu; remembered per visitor. */
(function () {
  var K = 'twk-ico', b = document.body, S = ['3d', 'gold', 'glass'];
  function stored() { try { var v = localStorage.getItem(K); return S.indexOf(v) >= 0 ? v : ''; } catch (e) { return ''; } }
  function apply() { var v = stored() || (b.dataset.mode === 'neon' ? 'glass' : 'gold'); b.dataset.ico = v; document.querySelectorAll('#iam button[data-i]').forEach(function (x) { x.classList.toggle('on', x.dataset.i === v); }); }
  var m = document.getElementById('iam');
  if (m && !m.querySelector('[data-i]')) {
    var h = document.createElement('div'); h.textContent = 'ÍCONOS'; h.style.cssText = 'font:800 9px system-ui;letter-spacing:.2em;color:#999;padding:8px 12px 2px';
    m.appendChild(h);
    [['3d', 'Relieve 3D'], ['gold', 'Medallón oro'], ['glass', 'Cristal neón']].forEach(function (x) {
      var e = document.createElement('button'); e.dataset.i = x[0]; e.textContent = x[1];
      e.addEventListener('click', function (ev) { ev.stopPropagation(); try { localStorage.setItem(K, x[0]); } catch (z) {} apply(); });
      m.appendChild(e);
    });
  }
  new MutationObserver(apply).observe(b, { attributes: true, attributeFilter: ['data-mode'] });
  apply();
})();
