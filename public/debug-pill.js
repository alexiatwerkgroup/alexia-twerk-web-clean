// Debug script - check if pill is being relocated
console.log('🔍 PILL DEBUG');

setInterval(() => {
  const pill = document.querySelector('.twerkhub-tokens-hud');
  const nav = document.querySelector('.twk-nav-v1');
  const badgeEl = document.querySelector('.twerkhub-tokens-badge');
  
  if (!pill) {
    console.log('❌ Pill not found');
    return;
  }
  
  const inNav = pill.classList.contains('twk-tk-hud--in-nav');
  const computedStyle = window.getComputedStyle(pill);
  
  console.log({
    hasInNavClass: inNav,
    position: computedStyle.position,
    top: computedStyle.top,
    right: computedStyle.right,
    zIndex: computedStyle.zIndex,
    parent: pill.parentElement?.className,
    transform: computedStyle.transform,
  });
}, 2000);
