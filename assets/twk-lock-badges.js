/**
 * TwerkhubLock Badges v1.0
 * Adds 🔒 lock icons to +18 restricted videos in the playlist
 * Compares data-vid attributes against the protected videoIds list
 */

(function() {
  'use strict';

  // List of +18 restricted video IDs (from youtube-age-classification.json, status: "blocked")
  // Updated 2026-05-19: 162 videos marked as age-restricted
  const RESTRICTED_IDS = [
    '-KY13UrI28c', '0b-fh93Wlwk', '0dA0iOK2ngE', '1cv9BUIFVek', '22so6zC3ww4',
    '2DqIngHkT_A', '2HQ-s7nV-9c', '33-8Q-PkJZ0', '4BQ5cfAJ-Hc', '4Ctd8N7uqzg',
    '4TR2lIpJPzQ', '51Ab0OFZBU4', '5FdAaRmhGzs', '5XG8bziPlWo', '6EtMrnHmzDk',
    '8ZeVz7wrOOk', '9iw8aLJXmiM', '9nc_ztduQlk', 'AMAhhc-O2ec', 'B5ggxUkZ1ZI',
    'Bl7sy4qHfbU', 'Bt53zC1WQdo', 'BzO6coJqzT4', 'CQYvo1EHZb4', 'ChSRVLSMrrI',
    'CyRedBNzmKw', 'DTZXU47F--A', 'EiCdnTGmkM0', 'EoIUHmPvUiQ', 'F7l8mUVOGhQ',
    'GEVxQV9kuVE', 'GIx3GPNIo3M', 'HAwtiTUrC6k', 'IKLCEJXdFGs', 'IsuPqJdiQkQ',
    'IvTfFQVsoRU', 'JZqLihfg5jE', 'Ji4CGNGbCTM', 'KO_pdtzzETA', 'LHtjlHK6_lY',
    'LLdivhydwFY', 'MwbNkiICqQI', 'N20S9og0A_s', 'O5OnCzUV_zE', 'OCtnA7MFZeY',
    'Ox-cM7b300g', 'P6VCmSxqZGw', 'PdwzDKidMYc', 'QPN-5jeS06Q', 'R91_sgitOzo',
    'RAl0hIjmT9A', 'RCxqsDagDsY', 'RTFL7VpjW3E', 'RmZTY7DKAHI', 'SS1uaRLyIUU',
    'SiaAdyBurDg', 'TLr9Mx3o7ac', 'TqXrSu7yG9A', 'U03fAf_zKFc', 'UXLcEsB7KRk',
    'VOjfVCNagQY', 'VVwSR4qnnbo', 'X_Ngqu78DrY', 'YjLy9z57jLA', 'YpktCjJ8fBE',
    'YrcXJwsqdYU', 'Z7oldqQBsd4', '_4Rvh6aQ8PE', '_Qd36sj5ymw', '_Wnd7KVgmGA',
    '_q1q33_qtbE', 'a-9kMQFxr78', 'aJ95UA2JMps', 'aoKVyfN4uvg', 'b6DhFGRz9-w',
    'bi8MpziBuao', 'cARAefd4QoQ', 'cNaVNoNv2Hg', 'ccvlVESYM5o', 'dEW_R6aCl84',
    'dgVysGLSkds', 'dh-OY94RJZY', 'e8jydxFPuZw', 'eECS5vSLfUM', 'eVBjr8TmGKw',
    'f0I__zhEeY4', 'fUvdvx7uaw8', 'fiNY_fyxSyw', 'g_5JqQmeYzw', 'gio0bT_Fa1s',
    'goz8C1QFz-g', 'h3RdzEK3MOk', 'hDFe_Lq-S1U', 'hfU3M17pcDw', 'hzygkV7kNpk',
    'iBU-u3VqD1E', 'jzBV20Uwvk8', 'k5Aed2DZHWg', 'kNfeGYZnpXc', 'koWQbjzp4EE',
    'lP6cc-fwdv0', 'm26_f38DiSA', 'm7gFei6kpGA', 'mAXVIFsTz3A', 'mRHX7ZNtH_c',
    'nzfp5miJqVA', 'o12nH3-LtVE', 'qD5xbr5hnVo', 'qmkPIGhXby4', 'qt9CneoD7zo',
    'r9ygRjwDRwg', 'rMdADsQzecY', 'sXR39ZTSofY', 'tMkUX-82o_E', 'tYsGNROAHIw',
    'v72rejgRkEM', 'vFFhmWdp920', 'vQm6BVU_MFg', 'vYTugluw2t8', 'vdwOB-krruM',
    'videoseries', 'vjraRAO1geA', 'vxZT_eM8ej4', 'vy0VhIzzfH8', 'vzGLKYqDkx8',
    'wET45cMTOzE', 'wbS_QDwAoO4', 'wcoOa-RO5CY', 'wetwM2PMpho', 'wk5yL5k5tko',
    'woLa5XG9HgU', 'wpF7v_dZn68', 'wwXQfkA08sI', 'xCMZGL2mi4M', 'xGVapfsZUGE',
    'xIkUVgpVAG0', 'xIuugQf9z34', 'xK7PerCRtG4', 'xRpigE0F_Fs', 'xZqa0c-cyyI',
    'xayL-bbr2gE', 'xcDnKofeD5o', 'xeNrbNC8ldo', 'xpPdu3WXYeg', 'xqGvMXH5IKY',
    'xxr7w6Ga_yM', 'yA77b2q4HVg', 'yAVvC02KC0A', 'yDNTL9x51Wc', 'yDfmQw2EB1g',
    'ySUPpW5i51I', 'ybxKFyzfTu8', 'yd9HeK9nEoY', 'ykfr1PRsqCo', 'yup141RaZuE',
    'ywveXy6z7xU', 'z-NT_N0KHuo', 'zBgZwVRgt1A', 'zLOQgB2aJtU', 'zdTXcbv17nM',
    'zu0gGNZqloM', 'zxSWP9gny1k'
  ];

  const restrictedSet = new Set(RESTRICTED_IDS);

  function markRestrictedVideos() {
    // Mark videos in the main grid (.vcard elements)
    document.querySelectorAll('.vcard[data-vid]').forEach(card => {
      const videoId = card.getAttribute('data-vid');
      if (restrictedSet.has(videoId)) {
        card.classList.add('twk-restricted-18');
      }
    });

    // Mark videos in the hot ranking sidebar (.rk-item elements)
    document.querySelectorAll('.rk-item[data-vid]').forEach(item => {
      const videoId = item.getAttribute('data-vid');
      if (restrictedSet.has(videoId)) {
        item.classList.add('twk-restricted-18');
      }
    });

    console.log('[twk-lock-badges] Marked ' + document.querySelectorAll('.twk-restricted-18').length + ' restricted videos with lock badges');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markRestrictedVideos);
  } else {
    markRestrictedVideos();
  }

  // Also run after any dynamic content updates (mutations)
  const observer = new MutationObserver(() => {
    markRestrictedVideos();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.twkLockBadges = {
    restrictedCount: restrictedSet.size,
    markedCount: () => document.querySelectorAll('.twk-restricted-18').length
  };
})();
