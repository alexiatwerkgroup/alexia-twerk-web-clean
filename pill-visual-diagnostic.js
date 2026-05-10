// Visual diagnostic overlay on page
(function() {
  setTimeout(function() {
    var pill = document.querySelector('.twerkhub-tokens-hud');
    
    if (!pill) {
      console.error('PILL NOT FOUND');
      return;
    }
    
    var cs = window.getComputedStyle(pill);
    var parent = pill.parentElement;
    var parentCS = window.getComputedStyle(parent);
    
    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'pill-diag';
    overlay.style.cssText = `
      position: fixed;
      top: 100px;
      left: 20px;
      background: #000;
      color: #0f0;
      padding: 15px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      border: 2px solid #0f0;
      max-width: 300px;
      white-space: pre-wrap;
      line-height: 1.5;
    `;
    
    var html = '=== PILL DIAGNOSTIC ===\n';
    html += 'position: ' + cs.position + '\n';
    html += 'top: ' + cs.top + '\n';
    html += 'right: ' + cs.right + '\n';
    html += 'transform: ' + cs.transform + '\n';
    html += 'z-index: ' + cs.zIndex + '\n';
    html += '\n=== PARENT ===\n';
    html += 'tag: ' + parent.tagName + '\n';
    html += 'class: ' + parent.className + '\n';
    html += 'position: ' + parentCS.position + '\n';
    html += 'overflow: ' + parentCS.overflow + '\n';
    html += '\n=== ISSUE ===\n';
    
    // Diagnose issue
    if (cs.position === 'fixed') {
      html += 'ISSUE: position=fixed\n';
      html += 'Action: Need to change to sticky';
    } else if (cs.position === 'sticky') {
      html += 'OK: position=sticky ✓\n';
      html += 'But might not be working due to:\n';
      if (parentCS.overflow !== 'visible') {
        html += '- parent overflow=' + parentCS.overflow;
      }
    }
    
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
  }, 500);
})();
