(function(){if(window.__twkStats)return;var cs=document.createElement('script');cs.src='/assets/twk-coin.js?v=1';cs.defer=true;document.head.appendChild(cs);window.__twkStats=1;
var jenny=/^\/jenny\//.test(location.pathname);
var st=document.createElement('style');st.textContent='.twk-stats{position:fixed;left:16px;bottom:'+(jenny?'92px':'16px')+';z-index:9990;display:flex;align-items:center;gap:9px;padding:11px 16px 11px 13px;border-radius:14px;background:linear-gradient(180deg,#ffa31f,#e86f00);color:#150a00;border:2px solid #ff8f00;font:700 12px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;box-shadow:0 0 24px rgba(255,143,0,.4),0 8px 20px rgba(0,0,0,.5);transition:transform .15s}.twk-stats:hover{transform:translateY(-2px)}.twk-stats svg{width:18px;height:18px;stroke:#150a00;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}@media(max-width:600px){.twk-stats span{display:none}.twk-stats{padding:12px}}';
document.head.appendChild(st);
var a=document.createElement('a');a.className='twk-stats';a.href='/account.html';a.setAttribute('aria-label','My stats');
a.innerHTML='<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg><span>My stats</span>';
document.documentElement.appendChild(a);})();
