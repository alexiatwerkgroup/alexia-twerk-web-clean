(function(){
  const SUPABASE_URL = 'https://vieqniahusdrfkpcuqsn.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZXFuaWFodXNkcmZrcGN1cXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTk2NjksImV4cCI6MjA4ODk5NTY2OX0.Ox8gUp0g-aYRvI2Zj6PWxx5unO3m3sEtal0OKLvPSkQ';
  if (!window.supabase) return;
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true, storageKey:'alexia-comments-auth-v2' } });
  const $ = s => document.querySelector(s);
  const esc = str => String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const prefsKey = 'alexia_profile_prefs_v1';
  function prefs(){ try { return JSON.parse(localStorage.getItem(prefsKey) || '{}') || {}; } catch(e){ return {}; } }
  function profilePrefs(userId){ return (prefs()[userId]) || {}; }
  function cleanDisplayName(value, fallback){
    let name = String(value || '').trim();
    if (!name) name = String(fallback || '').trim();
    if (!name) return 'Guest';
    if (/@/.test(name)) {
      const local = name.split('@')[0].replace(/[._-]+/g,' ').trim();
      if (local) name = local;
    }
    return name;
  }
  function userKey(userId, username){ return userId ? 'user:' + userId : 'name:' + String(username || '').trim().toLowerCase(); }
  function ago(ts){ const ms = Date.parse(ts || '') || 0; if(!ms) return 'offline'; const diff = Math.max(1, Math.floor((Date.now()-ms)/1000)); if(diff < 120) return 'online now'; const mins=Math.floor(diff/60); if(mins<60) return 'last seen '+mins+' min ago'; const hrs=Math.floor(mins/60); if(hrs<24) return 'last seen '+hrs+'h ago'; return 'last seen '+Math.floor(hrs/24)+'d ago'; }
  function isOnline(ts){ const ms = Date.parse(ts || '') || 0; return !!ms && (Date.now()-ms) < 5*60*1000; }
  function presenceBadge(item){ return '<span class="presence-inline"><span class="presence-dot '+(isOnline(item.last_seen)?'online':'offline')+'"></span><span>'+esc(ago(item.last_seen))+'</span></span>'; }
  function medalForRank(rank){ if (rank === 1) return { icon:'👑', label:'Crown leader', cls:'rank-1' }; if (rank === 2) return { icon:'🥈', label:'Second place', cls:'rank-2' }; if (rank === 3) return { icon:'🥉', label:'Third place', cls:'rank-3' }; return { icon:'✦', label:'Community member', cls:'' }; }
  function rep(stat){ const streak=Number(stat.streak||0); const points=stat.comments*10 + stat.likes*4 + stat.recent*2 + streak*3; let badge='Fresh voice', tier=1; if(points>=320){badge='Hall of heat';tier=4}else if(points>=170){badge='Crowd magnet';tier=3}else if(points>=70){badge='Rising heat';tier=2} return {points,badge,tier,streak}; }
  function avatar(name, userId, tier){ const pref = userId ? profilePrefs(userId) : {}; const tierClass = tier ? ' tier-' + tier : ''; if (pref.avatar_url) return '<span class="avatar img'+tierClass+'"><img src="'+esc(pref.avatar_url)+'" alt="'+esc(name)+'"></span>'; return '<span class="avatar'+tierClass+'">'+esc((String(name||'G')[0]||'G').toUpperCase())+'</span>'; }
  function prettySlug(slug){ try{ var s=String(slug||'').replace('/playlist/','').replace(/\.html$/i,''); try{s=decodeURIComponent(s)}catch(e){} try{s=s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')}catch(e){} s=s.replace(/[\-_]+/g,' ').replace(/\s+/g,' ').trim(); return s ? s.toUpperCase() : 'VIDEO'; }catch(e){ return 'VIDEO'; } }
  function streak(days){ const keys = Array.from(new Set((days||[]).filter(Boolean))).sort().reverse(); if (!keys.length) return 0; const cur = new Date(); cur.setHours(0,0,0,0); const fmt=d=>d.toISOString().slice(0,10); let expected=fmt(cur); if (keys[0]!==expected){ cur.setDate(cur.getDate()-1); expected=fmt(cur); if (keys[0]!==expected) return 0; } let s=0; for (const key of keys){ if (key===expected){ s+=1; cur.setDate(cur.getDate()-1); expected=fmt(cur);} else if (key < expected) break; } return s; }
  async function fetchJson(url){ const r=await fetch(url,{headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Cache-Control':'no-cache'},credentials:'omit',cache:'no-store'}); if(!r.ok) throw new Error(String(r.status)); return r.json(); }
  async function getCurrentIdentity(){
    try{
      const { data } = await client.auth.getSession();
      const user = data && data.session && data.session.user;
      if (!user) return null;
      let profile = null;
      try { const out = await client.from('profiles').select('*').eq('id', user.id).maybeSingle(); profile = out && out.data ? out.data : null; } catch(e){}
      const username = cleanDisplayName((profile && profile.username) || (user.user_metadata && (user.user_metadata.username || user.user_metadata.display_name)) || '', 'Guest');
      return { user_id:user.id, username: username || null };
    }catch(e){ return null; }
  }
  async function fetchAll(){
    const [comments, profiles, presenceRows, likeRows, current] = await Promise.all([
      client.from('video_comments').select('id,user_id,username_snapshot,author_name,body,likes_count,created_at,page_slug').order('created_at',{ascending:false}).limit(5000).then(r=>r.data||[]),
      client.from('profiles').select('*').limit(5000).then(r=>r.data||[]),
      fetchJson(SUPABASE_URL + '/rest/v1/page_visits?select=page,visitor_id,created_at&or=(page.like.presence::%25,page.eq.online)&order=created_at.desc&limit=20000&_=' + Date.now()).catch(()=>[]),
      fetchJson(SUPABASE_URL + '/rest/v1/page_visits?select=page,visitor_id,created_at&or=(page.like.comment_like::%25,page.like.comment_unlike::%25)&order=created_at.desc&limit=50000&_=' + Date.now()).catch(()=>[]),
      getCurrentIdentity()
    ]);
    const profMap = new Map((profiles||[]).map(row => [row.id, row]));
    const latestPresence = new Map();
    let hasOnlineVisitor = false;
    const likeMap = new Map();
    (Array.isArray(likeRows)?likeRows:[]).forEach(row=>{
      const page = String(row && row.page || '');
      let m = page.match(/^comment_like::(.+)$/);
      if(m){
        const cid = m[1];
        if(!likeMap.has(cid)) likeMap.set(cid, new Set());
        if(row && row.visitor_id) likeMap.get(cid).add(String(row.visitor_id));
        return;
      }
      m = page.match(/^comment_unlike::(.+)$/);
      if(m){
        const cid = m[1];
        if(!likeMap.has(cid)) likeMap.set(cid, new Set());
        if(row && row.visitor_id) likeMap.get(cid).delete(String(row.visitor_id));
      }
    });
    (Array.isArray(presenceRows)?presenceRows:[]).forEach(row=>{
      const page=String(row&&row.page||'');
      if (page === 'online') hasOnlineVisitor = true;
      const m=page.match(/^presence::(.+)$/); if(!m) return;
      const uid=m[1]; if(!latestPresence.has(uid)) latestPresence.set(uid, row.created_at||null);
    });
    const byUser=new Map(); const now=Date.now();
    (comments||[]).forEach(row=>{
      const username = cleanDisplayName((profMap.get(row.user_id)||{}).username || row.username_snapshot || row.author_name || '', 'Guest');
      const key = userKey(row.user_id, username);
      if(!byUser.has(key)) byUser.set(key,{key,user_id:row.user_id||null,username,comments:0,likes:0,recent:0,last_at:row.created_at,history:[],days:[]});
      const item=byUser.get(key);
      item.comments += 1;
      const storedLikes = Number(row.likes_count || 0) || 0;
      const eventLikes = likeMap.has(String(row.id)) ? likeMap.get(String(row.id)).size : 0;
      item.likes += Math.max(storedLikes, eventLikes);
      const createdMs = Date.parse(row.created_at || '') || 0;
      if (createdMs && now - createdMs < 14*24*60*60*1000) item.recent += 1;
      if (createdMs) item.days.push(new Date(createdMs).toISOString().slice(0,10));
      if (!item.last_at || createdMs > (Date.parse(item.last_at)||0)) item.last_at = row.created_at;
      if (item.history.length < 8) item.history.push({ body: row.body, page_slug: row.page_slug, created_at: row.created_at, likes_count: Math.max(Number(row.likes_count || 0) || 0, (likeMap.has(String(row.id)) ? likeMap.get(String(row.id)).size : 0)) });
    });
    byUser.forEach(item=>{
      item.streak = streak(item.days);
      item.last_seen = item.user_id ? (latestPresence.get(item.user_id) || item.last_at || null) : (item.last_at || null);
      if (current && ((item.user_id && current.user_id && item.user_id === current.user_id) || (current.username && item.username && item.username.toLowerCase() === current.username.toLowerCase()))) {
        item.last_seen = new Date().toISOString();
      }
      if (!item.user_id && hasOnlineVisitor && current && current.username && item.username.toLowerCase() === current.username.toLowerCase()) {
        item.last_seen = new Date().toISOString();
      }
      const r = rep(item); item.points=r.points; item.badge=r.badge; item.tier=r.tier; item.profile=item.user_id ? Object.assign({}, profMap.get(item.user_id) || {}, profilePrefs(item.user_id)) : {};
    });
    return Array.from(byUser.values());
  }
  function card(item, kicker){ return `<article class="row-card tier-${item.tier}" data-user-card="${esc(item.key)}"><div><div class="head">${avatar(item.username, item.user_id, item.tier)}<div class="copy"><strong>${esc(item.username)}</strong><span class="badge tier-${item.tier}">${esc(item.badge)}</span>${presenceBadge(item)}</div></div><div class="stats"><span><strong>${item.comments}</strong> comments</span><span><strong>${item.likes}</strong> likes</span><span><strong>${item.points}</strong> points</span></div></div><div><div class="meta">${kicker}</div><div class="sub">${item.streak >= 2 ? esc(item.streak + ' day streak') : 'Registered member'}${item.profile && item.profile.bio ? ' • ' + esc(String(item.profile.bio).slice(0,38)) : ''}</div></div></article>`; }
  function podium(items,label){ return `<div class="podium">` + items.slice(0,3).map((item,i)=>{ const medal=medalForRank(i+1); return `<article class="podium-card rank-${i+1}" data-user-card="${esc(item.key)}"><div class="podium-top"><span class="podium-kicker">${esc(label)}</span><span class="podium-rank ${medal.cls}">${medal.icon} #${i+1}</span></div><div class="head">${avatar(item.username, item.user_id, item.tier)}<div class="copy"><strong>${esc(item.username)}</strong><span class="badge tier-${item.tier}">${esc(item.badge)}</span>${presenceBadge(item)}</div></div><div class="stats"><span><strong>${item.comments}</strong> comments</span><span><strong>${item.likes}</strong> likes</span><span><strong>${item.points}</strong> points</span></div><div class="sub">${esc(medal.label)} • ${item.streak >= 2 ? item.streak + ' day streak • ' : ''}${esc(((item.profile && item.profile.bio) || 'Visible across the community right now.').slice(0,88))}</div></article>`; }).join('') + `</div>`; }
  function history(item){ return item.history.length ? item.history.map(row => `<div class="history-item"><div class="meta">${esc(prettySlug(row.page_slug))} • ${(function(ts){ const ms = Date.parse(ts||'')||Date.now(); const diff = Math.max(1, Math.floor((Date.now()-ms)/1000)); if(diff<60) return 'just now'; const mins=Math.floor(diff/60); if(mins<60) return mins+'h ago'.replace('h', 'm'); const hrs=Math.floor(mins/60); if(hrs<24) return hrs+'h ago'; return Math.floor(hrs/24)+'d ago'; })(row.created_at)} • ${Number(row.likes_count||0)} likes</div><div>${esc(row.body)}</div></div>`).join('') : '<div class="history-item">No comments yet.</div>'; }
  function openModal(item){ const modal = $('#community-profile-modal'); const box = modal.querySelector('.modal-body'); box.innerHTML = `<div class="modal-head">${avatar(item.username, item.user_id, item.tier).replace('avatar','profile-avatar')}<div><div class="kicker">Community profile</div><h3>${esc(item.username)}</h3><div class="badge tier-${item.tier}">${esc(item.badge)}</div>${presenceBadge(item)}<p>${esc((item.profile && item.profile.bio) || 'No public bio yet.')}</p></div></div><div class="grid"><div class="stat"><strong>${item.points}</strong><span>Reputation</span></div><div class="stat"><strong>${item.comments}</strong><span>Comments</span></div><div class="stat"><strong>${item.likes}</strong><span>Likes received</span></div><div class="stat"><strong>${item.recent}</strong><span>Active 14d</span></div></div><div class="panel"><h4>Comment history</h4>${history(item)}</div>`; modal.classList.add('open'); }
  function renderSection(sel, users, label, restLabelFn){ const el=$(sel); if(!el) return; if(!users.length){ el.innerHTML='<div class="empty">No users yet.</div>'; return; } el.innerHTML=podium(users,label)+'<div class="rank-grid">'+users.slice(3).map((item,i)=>card(item,restLabelFn(i+4))).join('')+'</div>'; }
  async function boot(){ try{ const users = await fetchAll(); const topCommenters=users.slice().sort((a,b)=>b.comments-a.comments||b.points-a.points).slice(0,18); const topLiked=users.slice().sort((a,b)=>b.likes-a.likes||b.points-a.points).slice(0,18); const active=users.slice().sort((a,b)=>b.recent-a.recent||b.comments-a.comments||b.points-a.points).slice(0,18); $('#community-count').textContent=String(users.length); renderSection('#rank-top-commenters',topCommenters,'Top commenters',n=>'#'+n+' by comments'); renderSection('#rank-top-liked',topLiked,'Most liked',n=>'#'+n+' by likes received'); renderSection('#rank-most-active',active,'Most active',n=>'#'+n+' active this fortnight'); document.querySelectorAll('[data-user-card]').forEach(node=>node.addEventListener('click', function(){ const item = users.find(u=>u.key===node.getAttribute('data-user-card')); if(item) openModal(item); })); const { data } = await client.auth.getSession(); const current = data && data.session && data.session.user; const btn=$('#your-profile-btn'); if(btn){ if(current){ const mine=users.find(u=>u.user_id===current.id); btn.addEventListener('click',()=> mine ? openModal(mine) : window.scrollTo({top:0,behavior:'smooth'}), {once:true}); } else { btn.addEventListener('click',()=>window.location.href='/home.html', {once:true}); } } }catch(e){ console.error(e); ['#rank-top-commenters','#rank-top-liked','#rank-most-active'].forEach(sel=>{const el=$(sel); if(el) el.innerHTML='<div class="empty">Community ranking unavailable right now.</div>';}); } }
  document.getElementById('community-profile-modal').addEventListener('click', function(e){ if(e.target===this || e.target.matches('[data-close-modal]')) this.classList.remove('open'); });
  boot();
})();
