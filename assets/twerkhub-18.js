/* +18 gate for explicit pages. Single implementation. */
(function(){
  var K='twk18';
  try{ if(localStorage.getItem(K)==='1') return; }catch(e){}
  var st=document.createElement('style');
  st.id='twk18s';
  st.textContent='html{overflow:hidden!important}body>*:not(#twk18){visibility:hidden!important}#twk18{position:fixed;inset:0;z-index:2147483647;background:#05030a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,sans-serif}#twk18 .b{max-width:460px;width:100%;text-align:center;border:1px solid #ffb02e55;border-radius:18px;padding:34px 26px;background:linear-gradient(#14101c,#0a0810);box-shadow:0 0 60px #ffb02e22}#twk18 h2{font:400 44px/1 Anton,Impact,sans-serif;color:#fff;margin:0 0 12px;letter-spacing:.02em}#twk18 p{color:#cfcfda;font-size:15px;line-height:1.55;margin:0 0 24px}#twk18 button,#twk18 a{display:block;width:100%;box-sizing:border-box;padding:16px;border-radius:12px;font:700 13px "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-decoration:none;margin-top:10px}#twk18 .y{display:flex}#twk18 .n{display:flex}';
  document.head.appendChild(st);
  if(!document.querySelector('link[href*="twk-ui.css"]')){var ui=document.createElement('link');ui.rel='stylesheet';ui.href='/assets/twk-ui.css?v=1';document.head.appendChild(ui);}
  function build(){
    var d=document.createElement('div');d.id='twk18';
    d.innerHTML='<div class="b"><h2>ADULTS ONLY · 18+</h2><p>This page contains sexually explicit material. All models are over 18 and appear under written contract. By entering you confirm that you are at least 18 years old and that viewing adult content is legal where you live.</p><button class="y" type="button">I am 18 or older · Enter</button><a class="n" href="https://www.google.com">Leave</a></div>';
    document.body.appendChild(d);
    d.querySelector('.y').onclick=function(){try{localStorage.setItem(K,'1')}catch(e){} d.remove(); st.remove();};
  }
  if(document.body) build(); else document.addEventListener('DOMContentLoaded',build);
})();
