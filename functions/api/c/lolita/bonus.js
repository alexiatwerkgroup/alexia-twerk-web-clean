import {authenticate} from '../../../_lib/auth.js';
import {ensureTables} from '../../../_lib/catalog.js';
import {BONUS_GROUPS,SPIN_WINDOW,SPINS_PER_HOUR,choosePrize} from '../../../_lib/lolita-bonus.js';
const reply=(d,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'no-store'}});
function random(n){const b=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(b)}while(b[0]>=limit);return b[0]%n;}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return reply({error:'method'},405);
 if(!env.DB||!env.JENNY_VIDEOS)return reply({error:'unavailable'},503);
 const identity=await authenticate(request,env);if(!identity?.sub)return reply({error:'login_required'},401);
 const user=await env.DB.prepare('SELECT email,tokens FROM profiles WHERE id=?').bind(identity.sub).first();
 if(!user)return reply({error:'login_required'},401);
 const email=String(user.email).toLowerCase(),uid=identity.sub;
 await ensureTables(env);
 // Return any coins previously spent on the fourteen parts: they are gifts.
 const ns=BONUS_GROUPS.flatMap(g=>g.parts),placeholders=ns.map(()=>'?').join(',');
 await env.DB.batch([
  env.DB.prepare(`UPDATE jenny_coins SET coins=coins+(SELECT COUNT(*) FROM catalog_unlocks u WHERE u.slug='lolita' AND u.email=jenny_coins.email AND u.via='coins' AND u.n IN (${placeholders})) WHERE email=?`).bind(...ns,email),
  env.DB.prepare(`UPDATE catalog_unlocks SET via='bonus-refunded' WHERE slug='lolita' AND email=? AND via='coins' AND n IN (${placeholders})`).bind(email,...ns)
 ]);
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS lolita_bonus_plays(claim_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,at INTEGER NOT NULL,reward TEXT NOT NULL)').run();
 await env.DB.prepare('CREATE INDEX IF NOT EXISTS lolita_bonus_plays_user_at ON lolita_bonus_plays(user_id,at)').run();
 const ownedRows=await env.DB.prepare("SELECT n FROM catalog_unlocks WHERE slug='lolita' AND email=?").bind(email).all();
 const owned=new Set((ownedRows.results||[]).map(x=>x.n));
 const won=BONUS_GROUPS.filter(g=>g.parts.every(n=>owned.has(n)));
 const now=Date.now();
 const recent=await env.DB.prepare('SELECT at,reward FROM lolita_bonus_plays WHERE user_id=? AND at>? ORDER BY at').bind(uid,now-SPIN_WINDOW).all();
 const plays=recent.results||[],remaining=Math.max(0,SPINS_PER_HOUR-plays.length),next=remaining?0:plays[0].at+SPIN_WINDOW;
 if(request.method==='GET')return reply({ok:true,now,next_at:next,remaining,tokens:user.tokens||0,won,last:plays.length?JSON.parse(plays[plays.length-1].reward):null});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'origin'},403);
 if(!remaining)return reply({error:'cooldown',now,next_at:next,remaining:0},429);
 const prize=choosePrize(BONUS_GROUPS.filter(g=>!won.some(w=>w.id===g.id)),random);
 if(prize.type==='video'){
  const objects=await Promise.all(prize.group.parts.map(n=>env.JENNY_VIDEOS.head('lolita/v'+n+'.mp4')));
  if(objects.some(o=>!o))return reply({error:'prize_not_ready'},503);
 }
 const claim=crypto.randomUUID();
 const statements=[env.DB.prepare('INSERT INTO lolita_bonus_plays(claim_id,user_id,at,reward) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM lolita_bonus_plays WHERE user_id=? AND at>?)<?').bind(claim,uid,now,JSON.stringify(prize),uid,now-SPIN_WINDOW,SPINS_PER_HOUR)];
 if(prize.type==='tokens')statements.push(env.DB.prepare('UPDATE profiles SET tokens=COALESCE(tokens,0)+?,total_earned=COALESCE(total_earned,0)+? WHERE id=? AND EXISTS(SELECT 1 FROM lolita_bonus_plays WHERE user_id=? AND claim_id=?)').bind(prize.tokens,prize.tokens,uid,uid,claim));
 else for(const n of prize.group.parts)statements.push(env.DB.prepare("INSERT OR IGNORE INTO catalog_unlocks(slug,email,n,via) SELECT 'lolita',?,?,'bonus' WHERE EXISTS(SELECT 1 FROM lolita_bonus_plays WHERE user_id=? AND claim_id=?)").bind(email,n,uid,claim));
 statements.push(env.DB.prepare('DELETE FROM lolita_bonus_plays WHERE user_id=? AND at<?').bind(uid,now-86400000));
 const results=await env.DB.batch(statements);
 if(results[0].meta.changes!==1)return reply({error:'cooldown',now,next_at:plays[0]?.at+SPIN_WINDOW||now+SPIN_WINDOW,remaining:0},429);
 const balance=await env.DB.prepare('SELECT tokens FROM profiles WHERE id=?').bind(uid).first();
 const current=await env.DB.prepare('SELECT at FROM lolita_bonus_plays WHERE user_id=? AND at>? ORDER BY at').bind(uid,now-SPIN_WINDOW).all();
 const left=Math.max(0,SPINS_PER_HOUR-current.results.length);
 return reply({ok:true,now,next_at:left?0:current.results[0].at+SPIN_WINDOW,remaining:left,prize,tokens:balance?.tokens||0});
}
