// Force pill to be sticky using JavaScript instead of CSS
(function() {
  console.log('[PILL STICKY] Activating JS sticky...');
  
  function makePillSticky() {
    const pill = document.querySelector('.twerkhub-tokens-hud');
    if (!pill) {
      console.log('[PILL STICKY] Pill not found yet, retrying...');
      setTimeout(makePillSticky, 500);
      return;
    }
    
    console.log('[PILL STICKY] Pill found, applying sticky behavior');
    
    // Force styles directly
    pill.style.setProperty('position', 'sticky', 'important');
    pill.style.setProperty('top', '10px', 'important');
    pill.style.setProperty('right', '14px', 'important');
    pill.style.setProperty('transform', 'none', 'important');
    pill.style.setProperty('z-index', '99', 'important');
    pill.style.setProperty('will-change', 'auto', 'important');
    
    // Remove transform if it's set
    if (pill.style.transform) {
      pill.style.transform = 'none';
    }
    
    // Log what we did
    const computed = window.getComputedStyle(pill);
    console.log('[PILL STICKY] Applied styles:', {
      position: computed.position,
      top: computed.top,
      right: computed.right,
      transform: computed.transform
    });
  }
  
  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', makePillSticky);
  } else {
    makePillSticky();
  }
  
  // Also run periodically in case pill loads later
  setTimeout(makePillSticky, 1000);
  setTimeout(makePillSticky, 2000);
})();
