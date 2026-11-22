/* Short mini previews across the Novinhas pages: several play together, capped by device so it never saturates. */
(function () {
  'use strict';
  // Live navigation can reinsert scripts; keep a single shared preview scheduler.
  if (window.__twkNovMotionInstalled) return;
  window.__twkNovMotionInstalled = true;
  var conn = navigator.connection || {};
  var small = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  var MAX = (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) ? 2 : (small ? 4 : 6);
  var entries = new Map(), actives = new Map(), idleTimer = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function visibleRows() {
    var rows = [], mid = window.innerHeight / 2;
    entries.forEach(function (x, v) {
      if (x.visible && v.isConnected && !x.failed && !actives.has(v)) {
        var r = v.getBoundingClientRect();
        rows.push({ v: v, x: x, d: Math.abs(r.top + r.height / 2 - mid) });
      }
    });
    rows.sort(function (a, b) {
      if (a.x.last !== b.x.last) return a.x.last - b.x.last;
      if (a.x.priority !== b.x.priority) return a.x.priority - b.x.priority;
      return a.d - b.d;
    });
    return rows;
  }
  function stop(v, reset) {
    if (!actives.has(v)) return;
    clearTimeout(actives.get(v)); actives.delete(v);
    try { v.pause(); if (reset) v.currentTime = 0; } catch (e) {}
  }
  function finish(v) {
    if (!actives.has(v)) return;
    var x = entries.get(v); if (x) x.last = Date.now();
    stop(v, true); schedule(160);
  }
  function schedule(ms) { clearTimeout(idleTimer); idleTimer = setTimeout(start, ms); }
  function start() {
    if (document.hidden) return;
    var rows = visibleRows();
    while (rows.length) {
      var next = rows.shift(), v = next.v;
      // Max 6 minis at once on PC (4 on phones, 2 on data saver): more simultaneous decoders drop frames and freeze everything. Ranking previews (force) always play.
      if (actives.size >= MAX && !next.x.force) continue;
      // Hottest Videos are an explicit five-second preview request from the site owner:
      // they keep moving even when the OS reduced-motion preference is on.
      if (reduce && reduce.matches && !next.x.force) continue;
      actives.set(v, 0);
      try { v.currentTime = 0; } catch (e) {}
      var p = v.play();
      if (p && p.catch) p.catch(function () { var x = entries.get(this); if (x) x.failed = true; finish(this); }.bind(v));
    }
    // Warm up the next few clips so each mini starts instantly (they are tiny files).
    rows.slice(0, 3).forEach(function (r) { if (r.v.preload === 'none') r.v.preload = 'auto'; });
  }
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (changes) {
    changes.forEach(function (e) {
      var x = entries.get(e.target); if (!x) return;
      x.visible = e.isIntersecting && e.intersectionRatio >= 0.2;
      if (!x.visible && actives.has(e.target)) stop(e.target, true);
    });
    schedule(120);
  }, { rootMargin: '80px 0px', threshold: [0, 0.2, 0.5] }) : null;
  function watch(v, priority, force, duration) {
    if (!observer || !v) return;
    var old = entries.get(v);
    if (old) {
      old.priority = Number(priority) || 0; old.force = !!force; old.duration = Number(duration) || 1800;
      return;
    }
    var x = { visible: false, failed: false, priority: Number(priority) || 0, force: !!force, duration: Number(duration) || 1800, last: 0 };
    entries.set(v, x);
    v.loop = false; v.preload = 'none';
    v.addEventListener('playing', function () {
      // Cards rotate: a mini plays up to ~10 s (or until it ends) so the 6 PC slots cycle through every visible card.
      if (actives.has(v) && !actives.get(v)) actives.set(v, setTimeout(function () { finish(v); }, x.force ? 120000 : 10000));
    });
    v.addEventListener('ended', function () { finish(v); });
    v.addEventListener('error', function () { var y = entries.get(v); if (y) y.failed = true; finish(v); });
    observer.observe(v); schedule(0);
  }
  function unwatch(v) {
    if (observer && v) observer.unobserve(v);
    entries.delete(v); stop(v, false);
  }
  function refresh(v) {
    var x = entries.get(v); if (!x) return;
    stop(v, true); x.failed = false; x.last = 0;
    try { v.load(); } catch (e) {}
    schedule(100);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { Array.from(actives.keys()).forEach(function (v) { stop(v, false); }); }
    else schedule(100);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) schedule(100); });
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', function (e) {
    if (e.matches) Array.from(actives.keys()).forEach(function (v) { var x = entries.get(v); if (!x || !x.force) stop(v, true); });
    else schedule(0);
  });
  window.TWKNovMotion = { watch: watch, unwatch: unwatch, refresh: refresh };
})();
