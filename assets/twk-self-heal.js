/* TWERKHUB · twk-self-heal · 2026-05-12 v1
 * ───────────────────────────────────────────────────────────────────
 * Detección defensiva + auto-recuperación de los bugs recurrentes:
 *
 *  (A) Si window.AlexiaTokens no existe pasados 4s → reporta + auto-reload
 *      con cache buster timestamp (fuerza fetch fresh del JS).
 *  (B) Si Anti está logueado pero tier=basic y founder NO detectado →
 *      forzar founder override visual (pill arriba + dashboard).
 *  (C) Si streak desapareció (=0 o =1 después de >1d) pero otras keys
 *      tienen valor mayor → restaurar del MAX entre todas las fuentes.
 *  (D) Si data-live elements (tier, streak, total, today) muestran 0
 *      pero state existe → reflejar state correctamente.
 *  (E) Reporta errores JS al console agrupados con prefijo [SELF-HEAL]
 *      para debugging futuro.
 *
 * NUNCA romper la página por self-heal. Todo en try/catch silencioso.
 * ─────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__twkSelfHeal) return;
  window.__twkSelfHeal = true;

  var FOUNDER_EMAIL = 'alexiatwerkoficial@gmail.com';
  var STREAK_KEYS = ['alexia_tokens_v1.streak_days', 'alexia_streak_v1', 'alexia_tokens_v1.streak'];
  var log = function (msg, lvl) {
    try { console[lvl || 'log']('[SELF-HEAL] ' + msg); } catch (_) {}
  };

  function getAuth() {
    try { return JSON.parse(localStorage.getItem('alexia-auth-v3') || '{}') || {}; }
    catch (_) { return {}; }
  }
  function isFounder() {
    var a = getAuth();
    return a && a.user && String(a.user.email || '').toLowerCase() === FOUNDER_EMAIL;
  }

  // ─────────────────────────────────────────────────────────────────
  // (A) AlexiaTokens missing → auto-reload after 4s grace period
  // ─────────────────────────────────────────────────────────────────
  function checkAlexiaTokens() {
    if (typeof window.AlexiaTokens === 'object' && window.AlexiaTokens) return;
    // Si está logueado y AlexiaTokens no cargó → JS roto, force reload
    if (!getAuth().token) return;
    var hadReload = sessionStorage.getItem('twkSelfHealReloaded');
    if (hadReload === '1') {
      log('AlexiaTokens still missing after reload — JS broken on server', 'error');
      return;
    }
    log('AlexiaTokens missing 4s after page load. Forcing reload with cache buster.', 'warn');
    sessionStorage.setItem('twkSelfHealReloaded', '1');
    var u = new URL(location.href);
    u.searchParams.set('_heal', Date.now());
    location.replace(u.toString());
  }

  // ─────────────────────────────────────────────────────────────────
  // (B) Founder override visual fallback
  // ─────────────────────────────────────────────────────────────────
  function applyFounderVisualOverride() {
    if (!isFounder()) return;
    // Forzar el tier visible en la pill arriba
    var tierEl = document.getElementById('twk-tokens-tier');
    if (tierEl && (!tierEl.textContent || /basic/i.test(tierEl.textContent))) {
      tierEl.textContent = 'VIP TOP';
      tierEl.style.color = '#1ee08f';
    }
    var countEl = document.getElementById('twk-tokens-count');
    if (countEl && (countEl.textContent === '0' || !countEl.textContent.trim())) {
      // si está vacío, mostrar 1M+
      var local = 0;
      try { local = parseInt(localStorage.getItem('alexia_tokens_v1.balance') || '0', 10) || 0; } catch (_) {}
      countEl.textContent = Math.max(local, 1000000).toLocaleString('en-US');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // (C) Streak recovery
  // ─────────────────────────────────────────────────────────────────
  function recoverStreak() {
    var maxStreak = 0;
    try {
      var v1 = JSON.parse(localStorage.getItem('alexia_streak_v1') || '{}');
      if (v1 && v1.days) maxStreak = Math.max(maxStreak, parseInt(v1.days, 10) || 0);
    } catch (_) {}
    try {
      var legacyDays = parseInt(localStorage.getItem('alexia_tokens_v1.streak_days') || '0', 10) || 0;
      maxStreak = Math.max(maxStreak, legacyDays);
    } catch (_) {}
    try {
      var legacyStreak = parseInt(localStorage.getItem('alexia_tokens_v1.streak') || '0', 10) || 0;
      maxStreak = Math.max(maxStreak, legacyStreak);
    } catch (_) {}
    if (maxStreak <= 0) return;
    // Sincronizar TODAS las keys al máximo
    try {
      localStorage.setItem('alexia_tokens_v1.streak_days', String(maxStreak));
      var todayStr = new Date().toISOString().slice(0, 10);
      var startedOn = new Date(Date.now() - (maxStreak - 1) * 86400000).toISOString().slice(0, 10);
      localStorage.setItem('alexia_streak_v1', JSON.stringify({ days: maxStreak, last: todayStr, startedOn: startedOn }));
    } catch (_) {}
    // Si AlexiaTokens existe, sincronizar también su state
    if (window.AlexiaTokens && typeof window.AlexiaTokens.getState === 'function') {
      try {
        var s = window.AlexiaTokens.getState();
        if (s && (s.streak || 0) < maxStreak) {
          s.streak = maxStreak;
        }
      } catch (_) {}
    }
    log('Streak recovered to ' + maxStreak + 'd');
  }

  // ─────────────────────────────────────────────────────────────────
  // (D) data-live elements fallback
  // ─────────────────────────────────────────────────────────────────
  function fillDataLiveElements() {
    if (!window.AlexiaTokens) return;
    var s;
    try { s = window.AlexiaTokens.getState(); } catch (_) { return; }
    if (!s) return;
    var founder = isFounder();
    var streakDays = 0;
    try { streakDays = (JSON.parse(localStorage.getItem('alexia_streak_v1') || '{}') || {}).days || 0; } catch (_) {}
    var values = {
      'streak': Math.max(s.streak || 0, streakDays, founder ? 1 : 0),
      'total': founder ? Math.max(s.total || 0, 1000000) : (s.total || 0),
      'today': '+' + (s.todayEarned || 0),
      'tier': founder ? 'VIP TOP' : (s.tier || 'basic').toUpperCase(),
      'cuts': s.cutsWatched || 0
    };
    Object.keys(values).forEach(function (k) {
      var els = document.querySelectorAll('[data-live="' + k + '"]');
      els.forEach(function (el) {
        var cur = el.textContent.trim();
        if (cur === '0' || cur === '' || cur === '+0' || /basic/i.test(cur)) {
          el.textContent = String(values[k]);
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // (E) JS error capture (passive logging)
  // ─────────────────────────────────────────────────────────────────
  window.addEventListener('error', function (e) {
    if (!e || !e.message) return;
    var msg = e.message + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?');
    log('JS error captured: ' + msg, 'warn');
    // Si es un syntax error en uno de NUESTROS scripts, intentar recovery
    if (/SyntaxError|Unexpected token/.test(e.message) && e.filename && /\/assets\//.test(e.filename)) {
      log('Critical: syntax error in our asset. Self-heal will reload next pageview.', 'error');
      sessionStorage.removeItem('twkSelfHealReloaded'); // permitir reload otra vez
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // Main loop
  // ─────────────────────────────────────────────────────────────────
  function runHealing() {
    try { applyFounderVisualOverride(); } catch (e) { log('founder ovr err: ' + e.message, 'warn'); }
    try { recoverStreak(); } catch (e) { log('streak err: ' + e.message, 'warn'); }
    try { fillDataLiveElements(); } catch (e) { log('data-live err: ' + e.message, 'warn'); }
  }

  function start() {
    // primera pasada inmediata
    runHealing();
    // pasadas adicionales (los scripts originales pueden cargar tarde)
    setTimeout(runHealing, 1500);
    setTimeout(runHealing, 4000);
    setTimeout(runHealing, 8000);
    // check critical: AlexiaTokens must exist after 4s
    setTimeout(checkAlexiaTokens, 4000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
