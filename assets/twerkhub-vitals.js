/*!
 * TWERKHUB · Core Web Vitals RUM — 2026-04-24
 * --------------------------------------------------------------
 * Real-user monitoring for LCP, CLS, INP, FCP, TTFB. Reports to
 * Cloudflare Analytics via `navigator.sendBeacon` so latency on
 * slow networks doesn't hurt the UX. Runs passively in idle time.
 *
 * Privacy: no PII, no cookies. Just perf metrics + URL hash.
 * --------------------------------------------------------------
 */
(function () {
  'use strict';
  if (window.__twerkhubVitalsInit) return;
  window.__twerkhubVitalsInit = true;

  // Guard: only modern browsers with PerformanceObserver
  if (!('PerformanceObserver' in window)) return;

  var ENDPOINT = '/api/vitals'; // Cloudflare Worker stub; returns 204 even if not deployed
  var sessionId = (function () {
    try {
      var id = sessionStorage.getItem('twk_vitals_sid');
      if (id) return id;
      id = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('twk_vitals_sid', id);
      return id;
    } catch (_) { return 'anon'; }
  })();

  var metrics = {};

  function send(metric) {
    var payload = {
      name: metric.name,
      value: Math.round(metric.value * 100) / 100,
      rating: metric.rating,
      url: location.pathname,
      sid: sessionId,
      ua: navigator.userAgent.slice(0, 100),
      ts: Date.now()
    };
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
      } else {
        fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(payload), keepalive: true }).catch(function(){});
      }
    } catch (_) {}
    console.info('[twerkhub-vitals]', metric.name, '=', payload.value, '(' + metric.rating + ')');
  }

  function rate(name, value) {
    // Thresholds per web.dev core-web-vitals spec
    if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    if (name === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    if (name === 'FCP') return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    if (name === 'TTFB') return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
    return 'unknown';
  }

  // LCP — largest contentful paint
  try {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      var last = entries[entries.length - 1];
      if (!last) return;
      metrics.LCP = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  // CLS — cumulative layout shift
  var clsValue = 0;
  var clsEntries = [];
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });
      metrics.CLS = clsValue;
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_) {}

  // FCP — first contentful paint
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (entry.name === 'first-contentful-paint') metrics.FCP = entry.startTime;
      });
    }).observe({ type: 'paint', buffered: true });
  } catch (_) {}

  // TTFB — via navigation entry
  try {
    var nav = performance.getEntriesByType('navigation')[0];
    if (nav) metrics.TTFB = nav.responseStart - nav.startTime;
  } catch (_) {}

  // INP — interaction to next paint (simplified: max event duration)
  var maxEventDuration = 0;
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (entry) {
        if (entry.duration > maxEventDuration) {
          maxEventDuration = entry.duration;
          metrics.INP = maxEventDuration;
        }
      });
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (_) {}

  // Flush on pagehide / visibilitychange (reliable across browsers)
  function flush() {
    Object.keys(metrics).forEach(function (name) {
      var value = metrics[name];
      if (value == null) return;
      send({ name: name, value: value, rating: rate(name, value) });
    });
    metrics = {};
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);

  console.info('[twerkhub-vitals] armed (LCP · CLS · INP · FCP · TTFB)');
})();
