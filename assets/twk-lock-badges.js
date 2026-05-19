/**
 * TwerkhubLock Badges v1.0
 * Adds 🔒 lock icons to +18 restricted videos in the playlist
 * Compares data-vid attributes against the protected videoIds list
 */

(function() {
  'use strict';

  // List of +18 restricted video IDs (from paywall-system.js CONFIG.videoIds)
  const RESTRICTED_IDS = [
    'QP7_D_-GnLo', 'MjR5TcOLvVg', 'w3WQWbHVPrE', 'KFTL0F3dEe4', 'PzVBMDmRiQw',
    'fLJJPn-c8no', 'CQH2tOAEW_s', 'wyKWnRZfJZc', 'PvVSFM0gjmk', 'nDJkpXWx3NY',
    'gF7YkWFKh6E', 'Lf_5nfKCdZU', 'Gw0fA-PwbRg', 'GvVLCGMJJLo', 'DqH-6K33KVQ',
    'lZCWoH8dJbg', 'fFfFMWi7VbE', 'WnmUbg7TSFM', 'FY-S8Jx-dAE', 'iHmSYcyATSE',
    'vFdzJG8LJ-c', 'K8Q-EkZG7k8', 'TXm0p1QLgbM', 'P5RqUWLcEZc', '_jJPAf9ELBg',
    'XGF9-rMvJIE', 'L8E8ZnP7qAo', 'tMjKmhKGqRQ', 'WZH-pTN-hBI', 'vOiO5Q4x9p0',
    'gZrMg4BQxXo', 'xKWYZxU0dDk', 'KSZpqJZJP_w', '6XKjJb2cBXQ', 'U1khTKvHHmE',
    'oFfVvCVDEAA', 'Mw5c6Q8LAqI', 'gzlqmDqMWvg', 'kpqRUOyK1u0', 'K5rU4Lbo8Sg',
    'T5WQnEQb6dg', 'xq0pNrUPhGo', 'nSvU_TqZkx4', 'HXNFYmqKjJo', 'oXBmIpNzWQo',
    'nw6T91bIWbg', 'gAkkJkeLqkA', 'b4rZyLGajYU', 'p-0BsGhAX_M', 'XdJBJH9smLk',
    'Y2amlXnfuT4', 'fN2dCzOm-rw', 'vfj_f_mQBIE', 'FnCUXyb-8vE', 'WXz-f4aw_8c',
    'kz_FrVb0H4g', '77TpJTzKNyk', 'T6rlT5z4z74', 'Fb1u5TqcXDE', 'j3N_5cYDz0A',
    '-U0U4Hkz1sE', 'Qmwxc8hLIas', 'dPOvWLGCAGA', '3tpKsoN7pMQ', 'K4JNjFLYqQQ'
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
