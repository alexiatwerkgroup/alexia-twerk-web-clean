/**
 * PAYWALL SYSTEM v1.0
 * Complete age-gated video protection for +18 content
 * Manages: shield overlays, age verification, video state tracking
 */

(function() {
  'use strict';

  const CONFIG = {
    videoIds: ['QP7_D_-GnLo', 'MjR5TcOLvVg', 'w3WQWbHVPrE', 'KFTL0F3dEe4', 'PzVBMDmRiQw', 'fLJJPn-c8no', 'CQH2tOAEW_s', 'wyKWnRZfJZc', 'PvVSFM0gjmk', 'nDJkpXWx3NY', 'gF7YkWFKh6E', 'Lf_5nfKCdZU', 'Gw0fA-PwbRg', 'GvVLCGMJJLo', 'DqH-6K33KVQ', 'lZCWoH8dJbg', 'fFfFMWi7VbE', 'WnmUbg7TSFM', 'FY-S8Jx-dAE', 'iHmSYcyATSE', 'vFdzJG8LJ-c', 'K8Q-EkZG7k8', 'TXm0p1QLgbM', 'P5RqUWLcEZc', '_jJPAf9ELBg', 'XGF9-rMvJIE', 'L8E8ZnP7qAo', 'tMjKmhKGqRQ', 'WZH-pTN-hBI', 'vOiO5Q4x9p0', 'gZrMg4BQxXo', 'xKWYZxU0dDk', 'KSZpqJZJP_w', '6XKjJb2cBXQ', 'U1khTKvHHmE', 'oFfVvCVDEAA', 'Mw5c6Q8LAqI', 'gzlqmDqMWvg', 'kpqRUOyK1u0', 'K5rU4Lbo8Sg', 'T5WQnEQb6dg', 'xq0pNrUPhGo', 'nSvU_TqZkx4', 'HXNFYmqKjJo', 'oXBmIpNzWQo', 'nw6T91bIWbg', 'gAkkJkeLqkA', 'b4rZyLGajYU', 'p-0BsGhAX_M', 'XdJBJH9smLk', 'Y2amlXnfuT4', 'fN2dCzOm-rw', 'vfj_f_mQBIE', 'FnCUXyb-8vE', 'WXz-f4aw_8c', 'kz_FrVb0H4g', '77TpJTzKNyk', 'T6rlT5z4z74', 'Fb1u5TqcXDE', 'j3N_5cYDz0A', '-U0U4Hkz1sE', 'Qmwxc8hLIas', 'dPOvWLGCAGA', '3tpKsoN7pMQ', 'K4JNjFLYqQQ'],
    shields: { enabled: true, opacity: 0.95, blurAmount: '8px' },
    ageVerification: { minAge: 18, persistent: true, expiryDays: 365 }
  };

  const STORAGE = {
    paywallAccepted: 'alexia_paywall_accepted_v1',
    viewedVideos: 'alexia_viewed_videos_v1',
    ageVerified: 'alexia_age_verified_v1'
  };

  function createAgeVerificationModal() {
    const modal = document.createElement('div');
    modal.id = 'alexia-age-modal-v3';
    modal.className = 'alexia-age-modal-overlay';
    modal.innerHTML = `<div class="alexia-age-modal-content"><div class="alexia-age-modal-header"><h2>Age Verification</h2><p>This content is for users 18+ only.</p></div><div class="alexia-age-modal-footer"><button id="alexia-age-decline" class="alexia-btn-secondary">Under 18</button><button id="alexia-age-confirm" class="alexia-btn-primary">18+</button></div></div>`;
    return modal;
  }

  function showAgeVerificationModal() {
    let modal = document.getElementById('alexia-age-modal-v3');
    if (!modal) {
      modal = createAgeVerificationModal();
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    document.getElementById('alexia-age-confirm').onclick = window.alexiaConfirmAge;
    document.getElementById('alexia-age-decline').onclick = () => {
      window.location.href = 'https://alexiatwerkgroup.com/';
    };
  }

  function unlockPaywall() {
    localStorage.setItem(STORAGE.paywallAccepted, JSON.stringify({
      accepted: true,
      timestamp: Date.now()
    }));
    document.querySelectorAll('.alexia-shield-overlay').forEach(s => s.style.display = 'none');
  }

  function isPaywallUnlocked() {
    const stored = localStorage.getItem(STORAGE.paywallAccepted);
    return stored ? JSON.parse(stored).accepted : false;
  }

  window.alexiaPaywallUnlock = unlockPaywall;
  window.alexiaConfirmAge = function() {
    unlockPaywall();
    const modal = document.getElementById('alexia-age-modal-v3');
    if (modal) modal.style.display = 'none';
    localStorage.setItem(STORAGE.ageVerified, 'true');
  };

  window.alexiaPaywallSystem = {
    config: CONFIG,
    isUnlocked: isPaywallUnlocked,
    unlock: unlockPaywall,
    showAgeModal: showAgeVerificationModal,
    checkStatus: function() {
      return { unlocked: isPaywallUnlocked(), videoCount: CONFIG.videoIds.length };
    }
  };

  if (!window.location.pathname.includes('/playlist/')) return;
  if (!isPaywallUnlocked()) {
    setTimeout(showAgeVerificationModal, 500);
  }
  console.log('[alexiaPaywallSystem] Initialized');
})();
