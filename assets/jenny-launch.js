(function () {
  'use strict';
  var nodes = document.querySelectorAll('[data-jenny-countdown]');
  if (!nodes.length) return;
  function run(node, now, deadline) {
    var start = performance.now(), reloading = false;
    function tick() {
      var left = Math.max(0, Math.ceil((deadline - now - (performance.now() - start)) / 1000));
      node.textContent = [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60].map(function (v) { return String(v).padStart(2, '0'); }).join(':');
      if (!left && !reloading) { reloading = true; setTimeout(function () { location.reload(); }, 1200); }
    }
    tick(); setInterval(tick, 1000);
  }
  nodes.forEach(function (node) {
    var now = Number(node.dataset.serverNow), deadline = Number(node.dataset.reopen);
    if (now && deadline) return run(node, now, deadline);
    fetch('/api/jenny/launch', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw Error(); return r.json(); }).then(function (d) {
      if (d.open) { node.textContent = 'NOW OPEN'; var section = node.closest('section'); if (section) { var title = section.querySelector('h2'), link = section.querySelector('a'); if (title) title.textContent = 'Jenny Uncensored is open.'; if (link) link.textContent = 'Enter Uncensored · 18+'; } return; }
      run(node, d.now, d.reopens_at);
    }).catch(function () { node.textContent = 'Opening soon'; });
  });
})();
