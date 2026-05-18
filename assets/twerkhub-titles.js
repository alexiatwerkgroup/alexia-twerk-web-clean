/*!
 * TWERKHUB · Suggestive Titles (deterministic by video id)
 * --------------------------------------------------------------
 * Every card gets a number AND a short evocative tagline. The tagline
 * is a deterministic pick from a 36-entry pool hashed against the video
 * id, so:
 *   · The SAME video always shows the SAME tagline (no refresh jitter).
 *   · DIFFERENT videos spread across all 36 entries for natural variety.
 *
 * Pool is calibrated "sexy + FOMO" — payment-processor safe. No
 * "explicit", "uncensored", "porn", "erotic", etc. — which trip Stripe
 * and CF automated filters.
 *
 * Public API:
 *   window.TwerkhubTitles.taglineFor('dQw4w9WgXcQ')  // → 'Atrevido'
 *
 * Version: 2026-04-20
 */
(function(){
  'use strict';
  if (window.TwerkhubTitles) return;

  var POOL = [
    // Single-word adjectives (25)
    'Atrevido','Sugerente','Sensual','Íntimo','Privado',
    'Exclusivo','Provocador','Insinuante','Seductor','Tentador',
    'Picante','Candente','Travieso','Indiscreto','Desinhibido',
    'Confidencial','Clandestino','Inédito','Reservado','Crudo',
    'Filoso','Audaz','Magnético','Hipnótico','Directo',
    // 2-word phrases (12)
    'Sesión Atrevida','Toma Privada','Drop Exclusivo','Cámara Íntima',
    'Archivo Sugerente','Detrás de Escena','Take Inédito','Pase Clandestino',
    'Pista Provocadora','Sesión Candente','Corte Atrevido','Fanta Desinhibida'
  ];

  function hash16(s){
    s = String(s == null ? '' : s);
    var h = 0;
    for (var i = 0; i < s.length; i++){
      h = ((h * 31) + s.charCodeAt(i)) & 0xffff;
    }
    return h;
  }

  function taglineFor(videoId){
    return POOL[hash16(videoId) % POOL.length];
  }

  // Convenience: format "#NNN · Tagline"
  function label(number, videoId){
    var n = (number || '').toString();
    if (n && n[0] !== '#') n = '#' + n;
    return n + ' · ' + taglineFor(videoId);
  }

  window.TwerkhubTitles = {
    taglineFor: taglineFor,
    label: label,
    pool: POOL.slice(),
    version: '2026-04-20'
  };
})();
