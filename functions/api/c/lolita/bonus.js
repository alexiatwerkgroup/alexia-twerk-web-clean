import {authenticate} from '../../../_lib/auth.js';
import {ensureTables} from '../../../_lib/catalog.js';
import {BONUS_GROUPS,SPIN_WAIT,choosePrize} from '../../../_lib/lolita-bonus.js';
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
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS lolita_bonus_spins(user_id TEXT PRIMARY KEY,last_at INTEGER NOT NULL,claim_id TEXT NOT NULL,reward TEXT NOT NULL)').run();
 const ownedRows=await env.DB.prepare("SELECT n FROM catalog_unlocks WHERE slug='lolita' AND email=?").bind(email).all();
 const owned=new Set((ownedRows.results||[]).map(x=>x.n));
 const won=BONUS_GROUPS.filter(g=>g.parts.every(n=>owned.has(n)));
 const spin=await env.DB.prepare('SELECT last_at,reward FROM lolita_bonus_spins WHERE user_id=?').bind(uid).first();
 const now=Date.now();
 if(request.method==='GET')return reply({ok:true,now,next_at:spin?spin.last_at+SPIN_WAIT:0,tokens:user.tokens||0,won,last:spin?JSON.parse(spin.reward):null});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'origin'},403);
 if(spin&&now<spin.last_at+SPIN_WAIT)return reply({error:'cooldown',now,next_at:spin.last_at+SPIN_WAIT},429);
 const prize=choosePrize(BONUS_GROUPS.filter(g=>!won.some(w=>w.id===g.id)),random);
 if(prize.type==='video'){
  const objects=await Promise.all(prize.group.parts.map(n=>env.JENNY_VIDEOS.head('lolita/v'+n+'.mp4')));
  if(objects.some(o=>!o))return reply({error:'prize_not_ready'},503);
 }
 const claim=crypto.randomUUID(),next=now+SPIN_WAIT;
 const statements=[env.DB.prepare('INSERT INTO lolita_bonus_spins(user_id,last_at,claim_id,reward) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET last_at=excluded.last_at,claim_id=excluded.claim_id,reward=excluded.reward WHERE lolita_bonus_spins.last_at<=?').bind(uid,now,claim,JSON.stringify(prize),now-SPIN_WAIT)];
 if(prize.type==='tokens')statements.push(env.DB.prepare('UPDATE profiles SET tokens=COALESCE(tokens,0)+?,total_earned=COALESCE(total_earned,0)+? WHERE id=? AND EXISTS(SELECT 1 FROM lolita_bonus_spins WHERE user_id=? AND claim_id=?)').bind(prize.tokens,prize.tokens,uid,uid,claim));
 else for(const n of prize.group.parts)statements.push(env.DB.prepare("INSERT OR IGNORE INTO catalog_unlocks(slug,email,n,via) SELECT 'lolita',?,?,'bonus' WHERE EXISTS(SELECT 1 FROM lolita_bonus_spins WHERE user_id=? AND claim_id=?)").bind(email,n,uid,claim));
 const results=await env.DB.batch(statements);
 if(results[0].meta.changes!==1)return reply({error:'cooldown',now,next_at:next},429);
 const balance=await env.DB.prepare('SELECT tokens FROM profiles WHERE id=?').bind(uid).first();
 return reply({ok:true,now,next_at:next,prize,tokens:balance?.tokens||0});
}
