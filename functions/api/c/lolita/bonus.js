import {authenticate} from '../../../_lib/auth.js';
import {CATALOG,SPIN_WINDOW,SPINS_PER_HOUR,choosePrize} from '../../../_lib/lolita-bonus.js';
const reply=(d,s=200)=>Response.json(d,{status:s,headers:{'Cache-Control':'private, no-store'}});
function random(n){const b=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(b)}while(b[0]>=limit);return b[0]%n;}
export async function onRequest({request,env}){
 if(!['GET','POST'].includes(request.method))return reply({error:'method'},405);
 if(!env.DB||!env.JENNY_VIDEOS)return reply({error:'unavailable'},503);
 if(request.method==='POST'&&request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'origin'},403);
 const identity=await authenticate(request,env);if(!identity?.sub)return reply({error:'login_required'},401);
 const user=await env.DB.prepare('SELECT email,tokens FROM profiles WHERE id=?').bind(identity.sub).first();if(!user)return reply({error:'login_required'},401);
 const uid=identity.sub,email=String(user.email).toLowerCase();
 await env.DB.batch([
 env.DB.prepare('CREATE TABLE IF NOT EXISTS lolita_bonus_plays(claim_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,at INTEGER NOT NULL,reward TEXT NOT NULL)'),
 env.DB.prepare('CREATE INDEX IF NOT EXISTS lolita_bonus_plays_user_at ON lolita_bonus_plays(user_id,at)'),
 env.DB.prepare('CREATE TABLE IF NOT EXISTS lolita_bonus_previews(email TEXT NOT NULL,n TEXT NOT NULL,won_at INTEGER NOT NULL,PRIMARY KEY(email,n))')
 ]);
 const now=Date.now();
 const own=await env.DB.prepare('SELECT n FROM lolita_bonus_previews WHERE email=? ORDER BY n').bind(email).all();const won=(own.results||[]).map(x=>({n:x.n,seconds:10}));
 const uploads=await env.DB.prepare("SELECT key FROM lolita_uploads WHERE status='complete' AND key LIKE 'lolita/v%.mp4'").all();const keys=new Set((uploads.results||[]).map(x=>x.key));const ready=CATALOG.every(n=>keys.has('lolita/v'+n+'.mp4'));
 const recent=await env.DB.prepare('SELECT at,reward FROM lolita_bonus_plays WHERE user_id=? AND at>? ORDER BY at').bind(uid,now-SPIN_WINDOW).all();const plays=recent.results||[],remaining=Math.max(0,SPINS_PER_HOUR-plays.length),next=remaining?0:plays[0].at+SPIN_WINDOW;
 if(request.method==='GET')return reply({ok:true,ready,now,next_at:next,remaining,tokens:user.tokens||0,won});
 if(!ready)return reply({error:'clips_preparing',now,next_at:next,remaining},503);
 if(!remaining)return reply({error:'cooldown',now,next_at:next,remaining:0},429);
 const prize=choosePrize(CATALOG.filter(n=>!won.some(w=>w.n===n)),random);
 if(prize.type==='clip'&&!(await env.JENNY_VIDEOS.head('lolita/v'+prize.n+'.mp4')))return reply({error:'prize_not_ready'},503);
 const claim=crypto.randomUUID();let query='INSERT INTO lolita_bonus_plays(claim_id,user_id,at,reward) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM lolita_bonus_plays WHERE user_id=? AND at>?)<?',args=[claim,uid,now,JSON.stringify(prize),uid,now-SPIN_WINDOW,SPINS_PER_HOUR];
 if(prize.type==='clip'){query+=' AND NOT EXISTS (SELECT 1 FROM lolita_bonus_previews WHERE email=? AND n=?)';args.push(email,prize.n)}
 const statements=[env.DB.prepare(query).bind(...args)];
 if(prize.type==='tokens')statements.push(env.DB.prepare('UPDATE profiles SET tokens=COALESCE(tokens,0)+?,total_earned=COALESCE(total_earned,0)+? WHERE id=? AND EXISTS(SELECT 1 FROM lolita_bonus_plays WHERE claim_id=?)').bind(prize.tokens,prize.tokens,uid,claim));
 else statements.push(env.DB.prepare('INSERT OR IGNORE INTO lolita_bonus_previews(email,n,won_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM lolita_bonus_plays WHERE claim_id=?)').bind(email,prize.n,now,claim));
 const results=await env.DB.batch(statements);
 const current=await env.DB.prepare('SELECT at FROM lolita_bonus_plays WHERE user_id=? AND at>? ORDER BY at').bind(uid,now-SPIN_WINDOW).all();const left=Math.max(0,SPINS_PER_HOUR-current.results.length),nextAt=left?0:current.results[0].at+SPIN_WINDOW;
 if(results[0].meta.changes!==1)return reply({error:left?'retry_spin':'cooldown',now,next_at:nextAt,remaining:left},left?409:429);
 const balance=await env.DB.prepare('SELECT tokens FROM profiles WHERE id=?').bind(uid).first();
 return reply({ok:true,ready:true,now,next_at:nextAt,remaining:left,prize,tokens:balance?.tokens||0});
}
