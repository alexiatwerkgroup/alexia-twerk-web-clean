/* One model roster and clear availability status across the exclusive catalogs. */
(function () {
  if (window.__twkModels) return;
  window.__twkModels = true;

  var models = [
    { name: 'Abbi', href: '/abbi/', status: 'LIVE', key: 'abbi' },
    { name: 'Jenny', href: '/jenny/', status: 'LIVE', key: 'jenny' },
    { name: 'Lolita', href: '/lolita/', status: 'LIVE', key: 'lolita' },
    { name: 'Tainara', href: '/tainara/', status: 'LIVE', key: 'tainara' },
    { name: 'Vegan', href: '/vegan/', status: 'COMING SOON', key: 'vegan' },
    { name: 'Camila', href: '/camila/', status: 'COMING SOON', key: 'camila' }
  ];

  var style = document.createElement('style');
  style.textContent = [
    '.tn2-mdd{position:relative;display:inline-flex}',
    '.tn2-mdp{display:none;position:absolute;right:0;top:calc(100% + 10px);min-width:260px;padding:8px;background:#111014;border:1px solid #3c3039;border-radius:14px;box-shadow:0 18px 40px #0009;z-index:10001}',
    '.tn2-mdd.open .tn2-mdp{display:block}',
    '.tn2-mdp a,.tn2-model-list a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:9px;color:#f5eff4;text-decoration:none;font:700 12px Inter,system-ui,sans-serif;letter-spacing:.02em}',
    '.tn2-mdp a:hover,.tn2-model-list a:hover{background:#211a22;color:#f1c77b}',
    '.tn2-mdp small,.tn2-model-list small{color:#b7a9b4;font:700 9px "JetBrains Mono",monospace;letter-spacing:.08em}',
    '.tn2-mdp a[data-status="COMING SOON"] small,.tn2-model-list a[data-status="COMING SOON"] small{color:#b7a9b4}',
    '.tn2-mdp a[data-status="MAINTENANCE"] small,.tn2-model-list a[data-status="MAINTENANCE"] small{color:#f1c77b}',
    '.tn2-model-heading{padding:9px 12px 5px;color:#b7a9b4;font:700 9px "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase}',
    '.tn2-model-list{border-top:1px solid #332a34;margin-top:6px;padding-top:6px}'
  ].join('');
  document.head.appendChild(style);

  function modelLink(model, current) {
    var link = document.createElement('a');
    link.href = model.href;
    link.dataset.status = model.status;
    if (model.key === current) link.setAttribute('aria-current', 'page');
    var name = document.createElement('span');
    name.textContent = model.name;
    var status = document.createElement('small');
    status.textContent = model.status;
    link.append(name, status);
    return link;
  }

  function run() {
    var current = document.body && document.body.dataset.model;
    var desktopLink = document.querySelector('.tn2-lk a.tn2-jn');
    if (desktopLink && !desktopLink.parentNode.classList.contains('tn2-mdd')) {
      var wrap = document.createElement('span');
      wrap.className = 'tn2-mdd';
      var button = document.createElement('a');
      button.href = '#models';
      button.className = desktopLink.className;
      button.setAttribute('role', 'button');
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');
      button.innerHTML = '<span class="hd-l" aria-hidden="true">✦</span><span class="hd-t"><b>Exclusive models</b><i>One collection · six profiles</i></span><span class="hd-c" aria-hidden="true">▾</span>';
      var panel = document.createElement('div');
      panel.className = 'tn2-mdp';
      panel.id = 'models';
      models.forEach(function (model) { panel.appendChild(modelLink(model, current)); });
      wrap.append(button, panel);
      desktopLink.replaceWith(wrap);
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var open = wrap.classList.toggle('open');
        button.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function (event) {
        if (!wrap.contains(event.target)) {
          wrap.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
        }
      });
      button.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          wrap.classList.remove('open');
          button.setAttribute('aria-expanded', 'false');
          button.focus();
        }
      });
    }

    var mobileNav = document.querySelector('.tn2 details nav');
    if (mobileNav && !mobileNav.querySelector('.tn2-model-list')) {
      var heading = document.createElement('div');
      heading.className = 'tn2-model-heading';
      heading.textContent = 'Exclusive models';
      var list = document.createElement('div');
      list.className = 'tn2-model-list';
      models.forEach(function (model) { list.appendChild(modelLink(model, current)); });
      mobileNav.append(heading, list);
    }

    document.querySelectorAll('.roster a.g').forEach(function (card) {
      var label = card.querySelector('b');
      var model = models.find(function (entry) {
        return label && entry.name.toLowerCase() === label.textContent.trim().toLowerCase();
      });
      if (!model || model.status !== 'COMING SOON') return;
      card.href = model.href;
      card.setAttribute('aria-label', model.name + ' · coming soon · no videos released');
      var preview = card.querySelector('video');
      if (preview) {
        preview.pause();
        preview.removeAttribute('src');
        preview.removeAttribute('data-src');
        preview.removeAttribute('autoplay');
      }
      var badge = card.querySelector('.model-availability');
      if (!badge) {
        badge = document.createElement('small');
        badge.className = 'model-availability';
        badge.textContent = model.status;
        card.appendChild(badge);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
