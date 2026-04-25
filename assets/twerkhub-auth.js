/* ═══ TWERKHUB · AUTH v4 ═══ */
(function(){
  'use strict';
  if (window.__twerkhubAuthInit) return;
  window.__twerkhubAuthInit = true;

  var KEY_CURRENT='alexia_current_user', KEY_USERS='alexia_registered_users', KEY_HOOK='alexia_registration_webhook';
  function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(_){return d;}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}}
  function ssGet(k,d){try{var v=sessionStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(_){return d;}}
  function ssSet(k,v){try{sessionStorage.setItem(k,JSON.stringify(v));}catch(_){}}
  function getCurrent(){var s=ssGet(KEY_CURRENT,null);return s||lsGet(KEY_CURRENT,null);}
  function setCurrent(u,remember){if(remember){lsSet(KEY_CURRENT,u);try{sessionStorage.removeItem(KEY_CURRENT);}catch(_){}}else{ssSet(KEY_CURRENT,u);try{localStorage.removeItem(KEY_CURRENT);}catch(_){}}}
  function clearCurrent(){try{localStorage.removeItem(KEY_CURRENT);}catch(_){}try{sessionStorage.removeItem(KEY_CURRENT);}catch(_){}}
  function getAllUsers(){var v=lsGet(KEY_USERS,[]);return Array.isArray(v)?v:[];}
  function saveUser(u){var list=getAllUsers();var idx=list.findIndex(function(x){return x&&x.username&&u.username&&x.username.toLowerCase()===u.username.toLowerCase();});if(idx>=0)list[idx]=Object.assign({},list[idx],u);else list.push(u);lsSet(KEY_USERS,list);}

  function wipeTokenState(){var P=['alexia_','twerkhub_','twerkhub-','sb-','supabase.auth','supabase-auth'];function m(k){if(!k)return false;for(var i=0;i<P.length;i++)if(k.indexOf(P[i])===0)return true;return false;}try{var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(m(k))ks.push(k);}ks.forEach(function(k){try{localStorage.removeItem(k);}catch(_){}});}catch(_){}try{var ks2=[];for(var j=0;j<sessionStorage.length;j++){var k2=sessionStorage.key(j);if(m(k2))ks2.push(k2);}ks2.forEach(function(k){try{sessionStorage.removeItem(k);}catch(_){}});}catch(_){}}
  function logout(){try{clearCurrent();}catch(_){}try{wipeTokenState();}catch(_){}try{window.dispatchEvent(new CustomEvent('alexia-tokens-changed',{detail:{balance:0,tier:'basic',logout:true}}));}catch(_){}var done=false;function go(){if(done)return;done=true;location.replace('/?logout='+Date.now());}setTimeout(go,800);try{if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){try{r.unregister();}catch(_){}});}).catch(function(){});}if(window.caches&&caches.keys){caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k).catch(function(){});}));}).then(go).catch(go);}else{go();}}catch(_){go();}}

  async function hashPassword(pw){try{var enc=new TextEncoder().encode('twk-salt-v1:'+String(pw||''));var buf=await crypto.subtle.digest('SHA-256',enc);return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}catch(_){var h=0,s='twk-salt-v1:'+String(pw||'');for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return 'h'+(h>>>0).toString(16);}}
  function isValidEmail(e){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim());}
  function genRandomPassword(){var c='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789',o='';for(var i=0;i<10;i++)o+=c[Math.floor(Math.random()*c.length)];return o;}

  async function register(username,password,email,remember){
    var u=String(username||'').trim(),pw=String(password||''),em=String(email||'').trim().toLowerCase();
    if(!u||!pw)return{ok:false,error:'Username and password required'};
    if(!/^[A-Za-z0-9_.\-]{2,32}$/.test(u))return{ok:false,error:'Username: 2-32 chars'};
    if(pw.length<4||pw.length>64)return{ok:false,error:'Password must be 4-64 chars'};
    if(em&&!isValidEmail(em))return{ok:false,error:'Email looks invalid'};
    var users=getAllUsers();
    if(users.find(function(x){return x&&x.username&&x.username.toLowerCase()===u.toLowerCase();}))return{ok:false,error:'Username already taken - try Sign In'};
    if(em&&users.find(function(x){return x&&x.email&&x.email.toLowerCase()===em;}))return{ok:false,error:'Email already registered - try Sign In or use Forgot password'};
    var clean={id:'u_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),username:u,passwordHash:await hashPassword(pw),email:em||'',nick:u,registeredAt:Date.now()};
    saveUser(clean);setCurrent(clean,!!remember);
    var hook=lsGet(KEY_HOOK,null);
    if(hook&&typeof hook==='string'){try{fetch(hook,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',id:clean.id,username:clean.username,email:clean.email})}).catch(function(){});}catch(_){}}
    try{if(window.AlexiaTokens&&window.AlexiaTokens.setBalance)window.AlexiaTokens.setBalance(0);}catch(_){}
    setTimeout(function(){try{window.AlexiaTokens&&window.AlexiaTokens.grant&&window.AlexiaTokens.grant(200,'Welcome, '+clean.username);}catch(_){}},700);
    return{ok:true,user:clean};
  }

  async function signIn(username,password,remember){
    var u=String(username||'').trim(),pw=String(password||'');
    if(!u||!pw)return{ok:false,error:'Enter your username and password'};
    var match=getAllUsers().find(function(x){return x&&x.username&&x.username.toLowerCase()===u.toLowerCase();});
    if(!match)return{ok:false,error:'No user with that username - try Sign Up'};
    var hash=await hashPassword(pw);
    if(!match.passwordHash||match.passwordHash!==hash)return{ok:false,error:'Wrong password'};
    setCurrent(match,!!remember);
    return{ok:true,user:match};
  }

  async function resetPassword(email){
    var em=String(email||'').trim().toLowerCase();
    if(!em||!isValidEmail(em))return{ok:false,error:'Enter a valid email'};
    var match=getAllUsers().find(function(x){return x&&x.email&&x.email.toLowerCase()===em;});
    if(!match)return{ok:false,error:'No account registered with that email'};
    var newPw=genRandomPassword();
    match.passwordHash=await hashPassword(newPw);
    match.passwordResetAt=Date.now();
    saveUser(match);
    var hook=lsGet(KEY_HOOK,null);var emailed=false;
    if(hook&&typeof hook==='string'){try{fetch(hook,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'password-recovery',username:match.username,email:match.email,newPassword:newPw})}).catch(function(){});emailed=true;}catch(_){}}
    return{ok:true,username:match.username,newPassword:newPw,emailed:emailed};
  }

  var STYLE='.twk-auth-backdrop{position:fixed;inset:0;z-index:2147483644;background:rgba(5,5,10,.82);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);display:flex;align-items:flex-start;justify-content:center;padding:24px 20px 40px;overflow-y:auto;animation:twkAuthFade .35s ease-out both;font-family:Inter,sans-serif}@media(min-height:780px){.twk-auth-backdrop{align-items:center}}@keyframes twkAuthFade{from{opacity:0}to{opacity:1}}.twk-auth-sheet{position:relative;width:100%;max-width:440px;margin:auto 0;background:linear-gradient(165deg,#11111a,#07070b);border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px 30px;box-shadow:0 40px 100px rgba(0,0,0,.65);animation:twkAuthRise .55s cubic-bezier(.22,.9,.38,1) .05s both}@keyframes twkAuthRise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}.twk-auth-crest{display:inline-flex;align-items:center;justify-content:center;width:54px;height:54px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(145deg,#ff2d87,#9d4edd);color:#fff;font:900 17px/1 "Playfair Display",serif;box-shadow:0 12px 30px rgba(255,45,135,.32)}.twk-auth-eye{display:block;text-align:center;font-size:10px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px}.twk-auth-title{font:800 clamp(24px,3.5vw,32px)/1.18 "Playfair Display",Georgia,serif;color:#fff;text-align:center;margin:0 0 8px}.twk-auth-title em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}.twk-auth-lede{font-size:13px;line-height:1.55;color:rgba(244,243,247,.72);text-align:center;margin:0 auto 22px;max-width:36ch}.twk-auth-form{display:flex;flex-direction:column;gap:11px}.twk-auth-label{display:block;font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#ff6fa8;margin-bottom:6px}.twk-auth-label-soft{color:rgba(255,111,168,.62)}.twk-auth-input{width:100%;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#f5f5fb;font:600 14px/1.3 Inter,sans-serif;box-sizing:border-box}.twk-auth-input:focus{outline:none;border-color:rgba(255,45,135,.6);box-shadow:0 0 0 3px rgba(255,45,135,.1)}.twk-auth-row{display:flex;align-items:center;gap:10px;justify-content:space-between;margin-top:2px;font-size:12px}.twk-auth-checkbox{display:inline-flex;align-items:center;gap:8px;color:rgba(244,243,247,.78);cursor:pointer;font:600 12px/1.2 Inter,sans-serif}.twk-auth-checkbox input{accent-color:#ff2d87;width:14px;height:14px}.twk-auth-link{background:none;border:0;color:#ff7eb0;text-decoration:underline;cursor:pointer;font:600 12px Inter,sans-serif;padding:0}.twk-auth-link:hover{color:#fff}.twk-auth-error{display:none;color:#ff6fa8;font-size:12px;font-weight:700;text-align:center;margin-top:4px}.twk-auth-error.is-visible{display:block}.twk-auth-success{display:none;color:#1ee08f;font-size:12.5px;text-align:center;margin-top:8px;line-height:1.5;background:rgba(30,224,143,.08);border:1px solid rgba(30,224,143,.35);padding:10px 12px;border-radius:10px}.twk-auth-success.is-visible{display:block}.twk-auth-success code{font-family:"JetBrains Mono",monospace;background:rgba(0,0,0,.3);padding:3px 8px;border-radius:6px;color:#fff;display:inline-block;margin-top:6px}.twk-auth-submit{margin-top:10px;width:100%;padding:14px;border-radius:10px;background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;font:800 11px/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase;border:0;cursor:pointer;box-shadow:0 14px 30px rgba(255,45,135,.36)}.twk-auth-submit:hover{transform:translateY(-2px)}.twk-auth-submit:disabled{opacity:.5;cursor:wait}.twk-auth-toggle{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:#ff7eb0;font:700 11.5px/1 Inter,sans-serif;border:1px solid rgba(255,45,135,.25);cursor:pointer}.twk-auth-toggle:hover{background:rgba(255,45,135,.08);color:#fff}.twk-auth-skip{margin-top:6px;width:100%;padding:10px;border-radius:10px;background:transparent;color:rgba(244,243,247,.55);font:600 11px/1 Inter,sans-serif;border:1px solid rgba(255,255,255,.08);cursor:pointer}.twk-auth-skip:hover{color:#fff;border-color:rgba(255,255,255,.2)}.twk-auth-close{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(244,243,247,.7);font:400 22px/1 Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}.twk-auth-close:hover{background:rgba(255,45,135,.22);color:#fff;transform:rotate(90deg)}.twk-auth-tos{font-size:11px;line-height:1.5;color:rgba(244,243,247,.5);text-align:center;margin:14px 0 0}.twk-auth-tos a{color:#ff6fa8}.twk-auth-legal{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(244,243,247,.35);text-align:center;margin-top:18px;padding-top:14px;border-top:1px solid rgba(255,255,255,.06)}.twk-acc-card{position:relative;border:1px solid rgba(255,45,135,.28);border-radius:22px;padding:38px 34px;background:linear-gradient(165deg,#11111a,#07070b);box-shadow:0 30px 80px rgba(0,0,0,.55);max-width:560px;margin:0 auto;text-align:center}.twk-acc-eye{display:block;font-size:10.5px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:#ff6fa8;margin-bottom:12px}.twk-acc-name{font:800 clamp(28px,4vw,42px)/1.15 "Playfair Display",Georgia,serif;color:#fff;margin:0 0 8px}.twk-acc-name em{font-style:italic;background:linear-gradient(135deg,#ff6fa8,#ffb454);-webkit-background-clip:text;background-clip:text;color:transparent}.twk-acc-meta{color:rgba(244,243,247,.7);font-size:14px;line-height:1.55;margin:0 auto 24px;max-width:46ch}.twk-acc-actions{display:flex;flex-direction:column;gap:10px;align-items:stretch;max-width:320px;margin:0 auto}.twk-acc-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 22px;border-radius:10px;font:800 12px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;border:0;cursor:pointer;text-decoration:none}.twk-acc-btn-primary{background:linear-gradient(180deg,#ff2d87,#9d4edd);color:#fff;box-shadow:0 14px 30px rgba(255,45,135,.34)}.twk-acc-btn-primary:hover{transform:translateY(-2px)}.twk-acc-btn-ghost{background:transparent;color:rgba(244,243,247,.85);border:1px solid rgba(255,255,255,.18)}.twk-acc-btn-ghost:hover{background:rgba(255,255,255,.06);border-color:rgba(255,45,135,.45);color:#fff}';
  function injectStyle(){if(document.getElementById('twk-auth-style'))return;var s=document.createElement('style');s.id='twk-auth-style';s.textContent=STYLE;document.head.appendChild(s);}
  function escapeHtml(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

  function showForm(mode){
    if(mode!=='signup'&&mode!=='signin'&&mode!=='recovery')mode='signup';
    injectStyle();
    var ex=document.getElementById('twk-auth-modal');if(ex)ex.remove();
    var root=document.createElement('div');root.id='twk-auth-modal';root.className='twk-auth-backdrop';root.setAttribute('data-mode',mode);
    if(mode==='recovery')root.innerHTML=renderRecovery();else if(mode==='signin')root.innerHTML=renderSignIn();else root.innerHTML=renderSignUp();
    document.body.appendChild(root);
    bindCommon(root);
    if(mode==='recovery')bindRecovery(root);else bindAuth(root,mode==='signup');
    document.documentElement.style.overflow='hidden';
  }

  function renderSignUp(){
    var h='<form class="twk-auth-sheet" novalidate>';
    h+='<button type="button" class="twk-auth-close">×</button>';
    h+='<div class="twk-auth-crest">A·T</div>';
    h+='<span class="twk-auth-eye">New member</span>';
    h+='<h2 class="twk-auth-title">Create your <em>handle</em>.</h2>';
    h+='<p class="twk-auth-lede">Username and password. Email is optional but recommended for password recovery.</p>';
    h+='<div class="twk-auth-form">';
    h+='<div><label class="twk-auth-label" for="twk-auth-username">Username</label>';
    h+='<input class="twk-auth-input" id="twk-auth-username" type="text" required maxlength="32" minlength="2" placeholder="solo.collector" autocomplete="username" autocapitalize="none"></div>';
    h+='<div><label class="twk-auth-label" for="twk-auth-password">Password</label>';
    h+='<input class="twk-auth-input" id="twk-auth-password" type="password" required maxlength="64" minlength="4" placeholder="Your secret" autocomplete="new-password"></div>';
    h+='<div><label class="twk-auth-label twk-auth-label-soft" for="twk-auth-email">Email (optional - recovery only)</label>';
    h+='<input class="twk-auth-input" id="twk-auth-email" type="email" maxlength="120" placeholder="you@domain.com" autocomplete="email" autocapitalize="none"></div>';
    h+='<div class="twk-auth-row"><label class="twk-auth-checkbox"><input type="checkbox" id="twk-auth-remember" checked> Remember me on this device</label></div>';
    h+='<p class="twk-auth-error" id="twk-auth-error"></p>';
    h+='<button type="submit" class="twk-auth-submit">Create account · +200 tokens</button>';
    h+='<button type="button" class="twk-auth-toggle" data-toggle-mode="signin">Already a member? · Sign in</button>';
    h+='<button type="button" class="twk-auth-skip">Maybe later</button>';
    h+='<p class="twk-auth-tos">By entering, you confirm you are 18+ and accept our <a href="/tos.html">terms</a> and <a href="/privacy.html">privacy</a>.</p>';
    h+='</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
    return h;
  }

  function renderSignIn(){
    var h='<form class="twk-auth-sheet" novalidate>';
    h+='<button type="button" class="twk-auth-close">×</button>';
    h+='<div class="twk-auth-crest">A·T</div>';
    h+='<span class="twk-auth-eye">Members only</span>';
    h+='<h2 class="twk-auth-title">Welcome <em>back</em>.</h2>';
    h+='<p class="twk-auth-lede">Enter your username and password to come back in.</p>';
    h+='<div class="twk-auth-form">';
    h+='<div><label class="twk-auth-label" for="twk-auth-username">Username</label>';
    h+='<input class="twk-auth-input" id="twk-auth-username" type="text" required maxlength="32" placeholder="solo.collector" autocomplete="username" autocapitalize="none"></div>';
    h+='<div><label class="twk-auth-label" for="twk-auth-password">Password</label>';
    h+='<input class="twk-auth-input" id="twk-auth-password" type="password" required maxlength="64" placeholder="Your secret" autocomplete="current-password"></div>';
    h+='<div class="twk-auth-row">';
    h+='<label class="twk-auth-checkbox"><input type="checkbox" id="twk-auth-remember" checked> Remember me</label>';
    h+='<button type="button" class="twk-auth-link" data-toggle-mode="recovery">Forgot password?</button>';
    h+='</div>';
    h+='<p class="twk-auth-error" id="twk-auth-error"></p>';
    h+='<button type="submit" class="twk-auth-submit">Sign in</button>';
    h+='<button type="button" class="twk-auth-toggle" data-toggle-mode="signup">Need an account? · Sign up</button>';
    h+='<button type="button" class="twk-auth-skip">Maybe later</button>';
    h+='</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
    return h;
  }

  function renderRecovery(){
    var h='<form class="twk-auth-sheet" novalidate>';
    h+='<button type="button" class="twk-auth-close">×</button>';
    h+='<div class="twk-auth-crest">A·T</div>';
    h+='<span class="twk-auth-eye">Password recovery</span>';
    h+='<h2 class="twk-auth-title">Reset your <em>password</em>.</h2>';
    h+='<p class="twk-auth-lede">Enter the email you registered with. We will send you a new password.</p>';
    h+='<div class="twk-auth-form">';
    h+='<div><label class="twk-auth-label" for="twk-rec-email">Registered email</label>';
    h+='<input class="twk-auth-input" id="twk-rec-email" type="email" required maxlength="120" placeholder="you@domain.com" autocomplete="email" autocapitalize="none"></div>';
    h+='<p class="twk-auth-error" id="twk-auth-error"></p>';
    h+='<p class="twk-auth-success" id="twk-auth-success"></p>';
    h+='<button type="submit" class="twk-auth-submit">Send new password</button>';
    h+='<button type="button" class="twk-auth-toggle" data-toggle-mode="signin">Back to sign in</button>';
    h+='</div><p class="twk-auth-legal">© Alexia Twerk Group · 18+</p></form>';
    return h;
  }

  function bindCommon(root){
    function dismiss(){closeForm();}
    root.querySelector('.twk-auth-close').addEventListener('click',dismiss);
    var sk=root.querySelector('.twk-auth-skip');if(sk)sk.addEventListener('click',dismiss);
    root.addEventListener('click',function(ev){if(ev.target===root)dismiss();});
    document.addEventListener('keydown',function eh(ev){if(ev.key==='Escape'){dismiss();document.removeEventListener('keydown',eh);}});
    root.querySelectorAll('[data-toggle-mode]').forEach(function(b){b.addEventListener('click',function(){var nm=b.getAttribute('data-toggle-mode');closeForm();showForm(nm);});});
  }

  function bindAuth(root,isSignUp){
    var errEl=root.querySelector('#twk-auth-error');
    function showError(m){errEl.textContent=m;errEl.classList.add('is-visible');}
    root.addEventListener('submit',function(ev){
      ev.preventDefault();
      var btn=root.querySelector('.twk-auth-submit');
      var u=root.querySelector('#twk-auth-username').value;
      var pw=root.querySelector('#twk-auth-password').value;
      var em=isSignUp?(root.querySelector('#twk-auth-email')||{}).value:'';
      var remember=(root.querySelector('#twk-auth-remember')||{}).checked;
      btn.disabled=true;errEl.classList.remove('is-visible');
      var p=isSignUp?register(u,pw,em,remember):signIn(u,pw,remember);
      Promise.resolve(p).then(function(res){btn.disabled=false;if(!res.ok){showError(res.error);return;}closeForm();setTimeout(function(){location.reload();},250);}).catch(function(e){btn.disabled=false;showError('Error: '+(e&&e.message||'try again'));});
    });
  }

  function bindRecovery(root){
    var errEl=root.querySelector('#twk-auth-error');var okEl=root.querySelector('#twk-auth-success');
    function showError(m){errEl.textContent=m;errEl.classList.add('is-visible');okEl.classList.remove('is-visible');}
    function showOk(html){okEl.innerHTML=html;okEl.classList.add('is-visible');errEl.classList.remove('is-visible');}
    root.addEventListener('submit',function(ev){
      ev.preventDefault();
      var btn=root.querySelector('.twk-auth-submit');
      var em=root.querySelector('#twk-rec-email').value;
      btn.disabled=true;
      Promise.resolve(resetPassword(em)).then(function(res){
        btn.disabled=false;
        if(!res.ok){showError(res.error);return;}
        if(res.emailed)showOk('Done. We sent the new password to <strong>'+escapeHtml(em)+'</strong>. Check inbox + spam.');
        else showOk('No email service configured yet. Save your new password now:<br><code>'+escapeHtml(res.newPassword)+'</code><br><small style="opacity:.7;display:block;margin-top:8px">Use it to sign in then change it.</small>');
        var inp=root.querySelector('#twk-rec-email');if(inp)inp.disabled=true;
        btn.style.display='none';
      }).catch(function(e){btn.disabled=false;showError('Error: '+(e&&e.message||'try again'));});
    });
  }

  function closeForm(){var el=document.getElementById('twk-auth-modal');if(el)el.remove();document.documentElement.style.overflow='';}
  function ensureAuthChip(){try{document.querySelectorAll('.twk-nav-v1 .twk-auth-chip,.twerkhub-tokens-hud .twk-auth-chip').forEach(function(el){el.remove();});}catch(_){}}

  function mountAccountAuthUI(){
    var host=document.getElementById('twk-account-auth');
    if(!host)return;
    injectStyle();
    var cur=getCurrent();
    if(cur){
      host.innerHTML='<div class="twk-acc-card"><div class="twk-acc-eye">Signed in as</div><h2 class="twk-acc-name">@'+escapeHtml(cur.username||cur.nick||'member')+'</h2><p class="twk-acc-meta">Member since '+new Date(cur.registeredAt||Date.now()).toLocaleDateString()+(cur.email?' · '+escapeHtml(cur.email):'')+'</p><div class="twk-acc-actions"><a class="twk-acc-btn twk-acc-btn-primary" href="/profile.html">Open profile →</a><button type="button" class="twk-acc-btn twk-acc-btn-ghost" id="twk-acc-logout">Log Out</button></div></div>';
      host.querySelector('#twk-acc-logout').addEventListener('click',function(){if(confirm('Log out? Your local token balance will be cleared.'))logout();});
    }else{
      host.innerHTML='<div class="twk-acc-card twk-acc-card-guest"><div class="twk-acc-eye">Members only</div><h2 class="twk-acc-name">Welcome to <em>Twerkhub</em>.</h2><p class="twk-acc-meta">Sign in to your account, or create one in 10 seconds. Username + password — email optional and only used for password recovery.</p><div class="twk-acc-actions"><button type="button" class="twk-acc-btn twk-acc-btn-primary" id="twk-acc-signup">Sign Up · +200 tokens</button><button type="button" class="twk-acc-btn twk-acc-btn-ghost" id="twk-acc-signin">Sign In</button></div></div>';
      host.querySelector('#twk-acc-signup').addEventListener('click',function(){showForm('signup');});
      host.querySelector('#twk-acc-signin').addEventListener('click',function(){showForm('signin');});
    }
  }

  function gate(){injectStyle();ensureAuthChip();mountAccountAuthUI();}

  window.TwerkhubAuth={getCurrent:getCurrent,getAllUsers:getAllUsers,register:register,signIn:signIn,resetPassword:resetPassword,logout:logout,showForm:showForm,showSignUp:function(){showForm('signup');},showSignIn:function(){showForm('signin');},showRecovery:function(){showForm('recovery');},mountAccountAuthUI:mountAccountAuthUI,setWebhook:function(url){lsSet(KEY_HOOK,String(url||''));},getWebhook:function(){return lsGet(KEY_HOOK,null);}};

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',gate,{once:true});else gate();
  var polls=0;var iv=setInterval(function(){ensureAuthChip();mountAccountAuthUI();polls++;if(polls>10)clearInterval(iv);},1000);
  window.addEventListener('storage',function(ev){if(ev.key===KEY_CURRENT){ensureAuthChip();mountAccountAuthUI();}});
})();
