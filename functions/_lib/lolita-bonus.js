export const BONUS_GROUPS = [
  {id:'01',parts:['46','81']},{id:'02',parts:['52','82']},
  {id:'03',parts:['53','83']},{id:'04',parts:['54','84']},
  {id:'05',parts:['59','85']},{id:'06',parts:['60','86']},
  {id:'07',parts:['79','87']}
];
export const isLolitaBonus = n => BONUS_GROUPS.some(g=>g.parts.includes(n));
export const SPIN_WAIT = 1200000;
export const WHEEL_TOKENS = [10,0,25,0,50,0,100,0];
export function choosePrize(unowned, random) {
  const segment=random(8),tokens=WHEEL_TOKENS[segment];
  if(tokens)return {segment,type:'tokens',tokens};
  if(!unowned.length)return {segment,type:'tokens',tokens:100,converted:true};
  return {segment,type:'video',tokens:0,group:unowned[random(unowned.length)]};
}
