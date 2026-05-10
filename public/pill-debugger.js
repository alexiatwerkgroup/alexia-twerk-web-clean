// Visual debugger overlay for pill positioning issues
(function() {
  console.log('[PILL DEBUGGER] Starting...');
  
  function createDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'pill-debug-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      background: rgba(0,0,0,0.9);
      color: #00ff00;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      z-index: 10001;
      max-width: 280px;
      line-height: 1.4;
      border: 1px solid #00ff00;
      box-shadow: 0 0 10px rgba(0,255,0,0.3);
    `;
    
    function updateDebug() {
      const pill = document.querySelector('.twerkhub-tokens-hud');
      const nav = document.querySelector('.twk-nav-v1');
      
      if (!pill) {
        overlay.innerHTML = '❌ PILL NOT FOUND';
        return;
      }
      
      const computed = window.getComputedStyle(pill);
      const rect = pill.getBoundingClientRect();
      
      const info = [
        '═══ PILL DEBUG ═══',
        `✓ Pill found`,
        `Parent: ${pill.parentElement?.className?.split(' ')[0] || 'body'}`,
        `Has .twk-tk-hud--in-nav: ${pill.classList.contains('twk-tk-hud--in-nav') ? '✓' : '✗'}`,
        '',
        '─ Computed Styles:',
        `position: ${computed.position}`,
        `top: ${computed.top}`,
        `right: ${computed.right}`,
        `transform: ${computed.transform === 'none' ? '✓ none' : '✗ ' + computed.transform}`,
        `z-index: ${computed.zIndex}`,
        '',
        '─ On Screen:',
        `Y-pos: ${Math.round(rect.top)}px`,
        `Sticky? ${rect.top <= 20 && rect.top >= -20 ? '✓ YES' : '✗ NO'}`,
      ];
      
      overlay.innerHTML = info.join('<br>');
    }
    
    document.body.appendChild(overlay);
    
    // Update every 500ms
    setInterval(updateDebug, 500);
    updateDebug();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDebugOverlay);
  } else {
    createDebugOverlay();
  }
})();
