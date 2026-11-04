export const SPIN_WINDOW=3600000;
export const SPINS_PER_HOUR=5;
export const CATALOG=Array.from({length:80},(_,i)=>String(i+1).padStart(2,'0'));
export const WHEEL_TOKENS=[10,25,50,100,0];
export function choosePrize(unowned,random){const segment=random(5),tokens=WHEEL_TOKENS[segment];if(tokens)return {segment,type:'tokens',tokens};if(!unowned.length)return {segment,type:'tokens',tokens:100,converted:true};return {segment,type:'clip',tokens:0,n:unowned[random(unowned.length)],seconds:10};}
