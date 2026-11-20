/* One short preview at a time across the Novinhas home page. */
(function () {
  'use strict';
  // Live navigation can reinsert scripts; keep a single shared preview scheduler.
  if (window.__twkNovMotionInstalled) return;
  window.__twkNovMotionInstalled = true;
  var entries = new Map(), active = null, timer = 0, idleTimer = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function visibleRows() {
    var rows = [];
    entries.forEach(function (x, v) { if (x.visible && v.isConnected && !x.failed) rows.push({ v: v, x: x }); });
    var mid = window.innerHeight / 2;
    rows.sort(function (a, b) {
      if (a.x.last !== b.x.last) return a.x.last - b.x.last;
      if (a.x.priority !== b.x.priority) return a.x.priority - b.x.priority;
      return Math.abs(a.v.getBoundingClientRect().top + a.v.offsetHeight / 2 - mid) - Math.abs(b.v.getBoundingClientRect().top + b.v.offsetHeight / 2 - mid);
    });
    return rows;
  }
  function stop(v, reset) {
    if (active !== v) return;
    clearTimeout(timer); timer = 0; active = null;
    try { v.pause(); if (reset) v.currentTime = 0; } catch (e) {}
  }
  function finish(v) {
    if (active !== v) return;
    var x = entries.get(v); if (x) x.last = Date.now();
    stop(v, true); clearTimeout(idleTimer); idleTimer = setTimeout(start, 160);
  }
  function start() {
    if (active) return;
    var next = visibleRows()[0]; if (!next) return;
    // Hottest Videos are an explicit five-second preview request from the site owner.
    // Keep those previews moving even when the OS reduced-motion preference is on;
    // the shared scheduler still allows only one video to play at a time.
    if (reduce && reduce.matches && !next.x.force) return;
    var v = next.v; active = v;
    try { v.currentTime = 0; } catch (e) {}
    var p = v.play();
    if (p && p.catch) p.catch(function () { var x = entries.get(v); if (x) x.failed = true; finish(v); });
  }
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (changes) {
    changes.forEach(function (e) {
      var x = entries.get(e.target); if (!x) return;
      x.visible = e.isIntersecting && e.intersectionRatio >= 0.2;
      if (!x.visible && active === e.target) stop(e.target, true);
    });
    clearTimeout(idleTimer); idleTimer = setTimeout(start, 120);
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
    v.addEventListener('playing', function onPlay() {
      if (active === v && !timer) timer = setTimeout(function () { finish(v); }, x.duration);
    });
    v.addEventListener('ended', function () { finish(v); });
    v.addEventListener('error', function () { var x = entries.get(v); if (x) x.failed = true; finish(v); });
    observer.observe(v); start();
  }
  function unwatch(v) {
    if (observer && v) observer.unobserve(v);
    entries.delete(v); if (active === v) stop(v, false);
  }
  function refresh(v) {
    var x = entries.get(v); if (!x) return;
    stop(v, true); x.failed = false; x.last = 0;
    try { v.load(); } catch (e) {}
    clearTimeout(idleTimer); idleTimer = setTimeout(start, 100);
  }
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', function (e) { if (e.matches && active) stop(active, true); else start(); });
  window.TWKNovMotion = { watch: watch, unwatch: unwatch, refresh: refresh };
})();
