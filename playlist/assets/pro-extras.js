
(function(){
  const doc=document;
  const path=(location.pathname||'').replace(/\/+$/,'');
  const isPlaylistIndex = /\/playlist$|\/playlist\/index\.html$|playlist\/?$/.test(path) || !!doc.querySelector('.playlist-rows') || !!doc.querySelector('#playlist-pro-panel');
  const isPlaylistDetail = /\/playlist\/.+\.html$/.test(path) && !/index\.html$/.test(path);
  const isDancerPage = /\/twerk-dancer\/.+\.html$/.test(path) || !!doc.querySelector('.list .card');
  const isBestPage = /best-twerk-dancers/.test(path);
  const isTop100 = /top-100-twerk-videos/.test(path);
  const watchedKey='alexiaWatchedPagesV3';
  const moodKey='alexiaMoodV3';
  const portalKey='alexiaPortalSeenV3';
  const q=(s,c=doc)=>Array.from(c.querySelectorAll(s));
  const one=(s,c=doc)=>c.querySelector(s);

  function storageGet(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback)); }catch(e){ return fallback; } }
  function storageSet(key,val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function hash(str){ let h=0; for(let i=0;i<str.length;i++) h=((h<<5)-h)+str.charCodeAt(i), h|=0; return Math.abs(h); }
  function ytAlt(src){
    const m=(src||'').match(/\/vi\/([^\/?]+)\//);
    if(!m) return null;
    return 'https://i.ytimg.com/vi/'+m[1]+'/mqdefault.jpg';
  }
  function cardTitle(card){
    return (one('h2,h3,strong,.title', card)?.textContent || card.getAttribute('data-title') || card.textContent || '').trim();
  }
  function cardHref(card){
    const a=card.matches('a')?card:one('a[href]',card);
    return a ? a.getAttribute('href') : '';
  }
  function ensureWatched(href){
    if(!href) return;
    const list=storageGet(watchedKey,[]);
    if(!list.includes(href)){ list.push(href); storageSet(watchedKey,list); }
  }
  function watchedList(){ return storageGet(watchedKey,[]); }

  function addMoodSwitch(anchor){ return; 
    if(!anchor || one('.pro-mood-switch', anchor.parentElement||doc)) return;
    const wrap=doc.createElement('div');
    wrap.className='pro-mood-switch';
    ['club','studio','archive'].forEach(mode=>{
      const b=doc.createElement('button');
      b.type='button';
      b.className='pro-mood-btn';
      b.textContent=mode;
      b.addEventListener('click',()=>{ localStorage.setItem(moodKey,mode); applyMood(); });
      wrap.appendChild(b);
    });
    anchor.insertAdjacentElement('afterend', wrap);
    applyMood();
  }
  function applyMood(){
    const mood=localStorage.getItem(moodKey)||'club';
    doc.body.classList.remove('mood-club','mood-studio','mood-archive');
    doc.body.classList.add('mood-'+mood);
    q('.pro-mood-btn').forEach(btn=>btn.classList.toggle('is-active', btn.textContent.toLowerCase()===mood));
  }

  function enhanceCards(root){
    q('.card,.mini-card,.list .card,.grid .card', root).forEach(card=>{
      if(card.dataset.proEnhanced) return;
      card.dataset.proEnhanced='1';
      card.classList.add('pro-card-enhanced');
      const thumb = one('.thumb', card) || card;
      const img = one('img', thumb);
      if(thumb && !one('.pro-live-pulse', thumb) && (card.matches('.mini-card') || card.closest('.mini-rail') || card.closest('.grid'))){
        const pulse=doc.createElement('span'); pulse.className='pro-live-pulse'; thumb.appendChild(pulse);
      }
      if(thumb && !one('.pro-heatline', thumb)){
        const heat=doc.createElement('span'); heat.className='pro-heatline'; thumb.appendChild(heat);
      }
      if(img && !one('.pro-alt-thumb', thumb)){
        const altSrc=ytAlt(img.getAttribute('src'));
        if(altSrc){
          const alt=doc.createElement('img'); alt.className='pro-alt-thumb'; alt.alt=''; alt.src=altSrc; thumb.appendChild(alt);
        }
      }
      const href=cardHref(card);
      if(href){
        card.addEventListener('click',()=>ensureWatched(href), {passive:true});
      }
    });
  }

  function buildBecause(anchor, title, nodes){
    if(!anchor || one('.pro-because', anchor.parentElement||doc)) return;
    const items=(nodes||[]).filter(Boolean).slice(0,4);
    if(!items.length) return;
    const section=doc.createElement('section');
    section.className='pro-because';
    section.innerHTML='<h3>'+title+'</h3><div class="pro-because-grid"></div>';
    const grid=one('.pro-because-grid', section);
    items.forEach(card=>{
      const href=cardHref(card)||'#';
      const title=cardTitle(card) || 'Explore this page';
      const meta=(one('.meta,.excerpt,p', card)?.textContent || 'A related page from the archive chosen to keep discovery moving naturally.').trim();
      const a=doc.createElement('a');
      a.className='pro-because-card';
      a.href=href;
      a.innerHTML='<strong>'+title+'</strong><small>'+meta.slice(0,120)+'</small>';
      grid.appendChild(a);
    });
    anchor.insertAdjacentElement('afterend', section);
  }

  function buildEditorial(anchor){
    if(!anchor || one('.pro-editorial', anchor.parentElement||doc)) return;
    const items=[
      ['Studio energy','Tighter class sessions, stronger synchronized movement and cleaner rehearsal energy.'],
      ['Archive classics','Pages that still pull attention because the choreography sticks on replay.'],
      ['Club energy','More aggressive rhythm, louder attitude and darker performance mood.'],
      ['Russian style','A faster route into the pages with colder visuals and harder floor presence.']
    ];
    const section=doc.createElement('section');
    section.className='pro-editorial';
    section.innerHTML='<h3>Editorial collections</h3><div class="pro-editorial-grid"></div>';
    const grid=one('.pro-editorial-grid', section);
    items.forEach(([name,desc],idx)=>{
      const a=doc.createElement('a');
      a.href='#';
      a.className='pro-collection';
      a.innerHTML='<strong>'+name+'</strong><small>'+desc+'</small><div class="pro-chip-row"><span class="pro-chip">'+(['Curated','Replay heavy','Premium','Discovery'])[idx]+'</span></div>';
      a.addEventListener('click',e=>{ e.preventDefault(); window.scrollTo({top:(one('.grid,.list,.mini-rail')?.getBoundingClientRect().top||0)+window.scrollY-100, behavior:'smooth'}); });
      grid.appendChild(a);
    });
    anchor.insertAdjacentElement('afterend', section);
  }


  function buildMoneyRoute(anchor){
    if(!anchor || one('.pro-money-route', anchor.parentElement||doc)) return;
    const section=doc.createElement('section');
    section.className='pro-money-route';
    section.innerHTML='<h3>Private video packs</h3><p>Looking for direct premium access instead of discovery mode? Use the private packs page for faster buying routes, clearer tiers and the strongest commercial hub in the archive.</p><div class="pro-money-actions"><a class="pro-money-link" href="/alexia-video-packs.html"><strong>Open Alexia Video Packs</strong><small>Starter, extended and legacy routes for serious buyers.</small></a></div>';
    anchor.insertAdjacentElement('afterend', section);
  }

  function initPortal(){
    if(!isPlaylistIndex || localStorage.getItem(portalKey)==='1') return;
    const portal=doc.createElement('div');
    portal.className='pro-portal is-open';
    portal.innerHTML='<div class="pro-portal-card"><h2>Enter the archive</h2><p>A premium discovery layer added above the playlist: hover previews, watched history, editorial routes, dynamic ranking cues and recommendation blocks.</p><div class="pro-portal-actions"><a class="pro-portal-link" href="/playlist/"><strong>Enter Playlist</strong><span>Open the main live archive with rows, ranking and replay cues.</span></a><a class="pro-portal-link" href="/best-twerk-dancers.html"><strong>Explore Dancers</strong><span>Jump into dancers, studios and grouped archive pages.</span></a><a class="pro-portal-link" href="/top-100-twerk-videos.html"><strong>Open Top 100</strong><span>Browse the strongest ranked pages in the current selection.</span></a></div><button class="pro-close" type="button">Continue inside</button></div>';
    doc.body.appendChild(portal);
    const close=()=>{ portal.classList.remove('is-open'); localStorage.setItem(portalKey,'1'); setTimeout(()=>portal.remove(),260); };
    one('.pro-close', portal).addEventListener('click',close);
    portal.addEventListener('click',e=>{ if(e.target===portal) close(); });
  }

  function applyRankingMovement(){
    q('#hot-ranking > *, .rank-list > *').forEach((item,idx)=>{
      if(one('.pro-rank-move', item)) return;
      const txt=(item.textContent||'') + idx;
      const n=hash(txt)%3;
      const badge=doc.createElement('span');
      badge.className='pro-rank-move ' + (n===0?'up':n===1?'same':'down');
      badge.textContent=n===0?'▲ +2':n===1?'● same':'▼ -1';
      const host = one('a,button,div', item) || item;
      host.style.display='flex'; host.style.alignItems='center'; host.style.gap='10px';
      host.appendChild(badge);
    });
  }

  function stickyRankingFix(){
    const sp=one('.sidepanel');
    if(!sp) return;
    sp.style.position='sticky';
    sp.style.top='86px';
    sp.style.alignSelf='start';
    const p=sp.parentElement;
    if(p){ p.style.overflow='visible'; }
  }

  function buildCinemaFocus(){
    if(!isPlaylistDetail) return;
    const actions=one('.card-actions') || one('.action-row') || one('.hero') || one('main');
    if(!actions || one('.pro-cinema-toggle')) return;
    const btn=doc.createElement('button');
    btn.type='button';
    btn.className='pro-cinema-toggle';
    btn.textContent='Cinema focus';
    btn.addEventListener('click',()=>{ doc.body.classList.toggle('cinema-focus'); btn.textContent=doc.body.classList.contains('cinema-focus')?'Exit focus':'Cinema focus'; });
    actions.appendChild(btn);
  }

  function watchedMarking(){
    const seen=watchedList();
    q('.card,.mini-card,.list .card,.grid .card').forEach(card=>{
      const href=cardHref(card);
      if(href && seen.includes(href)){
        card.classList.add('is-watched');
        const thumb=one('.thumb', card) || card;
        if(thumb && !one('.pro-watched', thumb)){
          const badge=doc.createElement('span'); badge.className='pro-watched'; badge.textContent='Viewed'; thumb.appendChild(badge);
        }
      }
    });
  }

  function init(){
    applyMood();
    addMoodSwitch(one('.nav-row') || one('.nav') || one('.hero') || one('main h1')?.parentElement || one('main'));
    if(!isPlaylistDetail){
      enhanceCards(doc);
      watchedMarking();
    } else {
      ensureWatched(location.pathname.split('/').pop());
      return;
    }

    if(isPlaylistIndex){
      initPortal();
      buildEditorial(one('.playlist-pro-panel') || one('.hero') || one('main'));
      buildMoneyRoute(one('.playlist-pro-panel') || one('.hero') || one('main'));
      buildBecause(one('.playlist-pro-panel') || one('.hero') || one('main'), 'Because you watched…', q('.mini-rail > .mini-card, .grid > .card'));
      applyRankingMovement();
      stickyRankingFix();
    }

    if(isPlaylistDetail){
      ensureWatched(location.pathname.split('/').pop());
      buildCinemaFocus();
      buildBecause(one('main') || one('.wrap') || doc.body, 'Because you watched…', q('.related .card, .list .card, .grid .card').slice(0,8));
    }

    if(isDancerPage){
      const relatedSection = one('.section-divider + section') || q('section')[1] || one('section:last-of-type') || one('.hero') || one('main') || doc.body;
      buildBecause(relatedSection, 'Because you watched…', q('.list > .card, .grid > .card'));
      buildMoneyRoute(one('.pro-because') || relatedSection);
      buildEditorial(one('.pro-money-route') || one('.pro-because') || relatedSection);
    }

    if(isBestPage || isTop100){
      buildEditorial(one('.hero') || one('main') || doc.body);
      buildMoneyRoute(one('.hero') || one('main') || doc.body);
      buildBecause(one('.wrap') || one('main') || doc.body, 'Because you watched…', q('.list > .card, .grid > .card'));
    }
  }

  if(doc.readyState==='loading'){ doc.addEventListener('DOMContentLoaded', init); } else { init(); }

  const rk=one('#hot-ranking');
  if(rk){
    const obs=new MutationObserver(()=>{ applyRankingMovement(); stickyRankingFix(); });
    obs.observe(rk,{childList:true,subtree:true});
  }
})();
