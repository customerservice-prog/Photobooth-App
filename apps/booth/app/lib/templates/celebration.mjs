import {context,begin,finish,R,P,L,T,G,C,label,tiny,name,photo,frame,blooms,foliage,glint,dust,footer,esc} from './svg-kit.mjs';
import {validateShotSet} from '../photo-strip.mjs';
function flowers(q){const {d,c,cfg,gold}=q;let a=begin(q)+frame(gold)+R(0,0,1200,1800,`url(#${q.id}-wash)`);
 a+=blooms(-77,-29,.58,-12)+blooms(1168,1797,.71,175);
 a+=tiny('A CELEBRATION OF',610,174,792,d.ink)+name(c.title,610,309,845,149,d.accent,{bounds:[205,365]});
 a+=photo(q,{x:118,y:431,w:964,h:922});
 const host=cfg.details?.honoree||c.subtitle;a+=T(host,550,1471,780,76,d.ink,{face:'serif',lines:2,bounds:[1400,1564]})+L(410,1592,690,1592,d.accent);
 if(cfg.details?.honoree)a+=T(c.subtitle===cfg.details.honoree?'':c.subtitle,550,1654,764,29,d.ink,{face:'sans'});
 a+=T(c.date,550,1724,807,27,d.ink,{face:'sans',tracking:1});return finish(q,a);}
function evening(q){const {d,c,cfg,gold}=q;let a=begin(q)+frame(gold)+dust(gold,300,76);
 a+=tiny('GOOD COMPANY · GREAT MEMORIES',600,151,904,d.ink)+name(c.title,600,288,975,146,gold,{face:'serif',bounds:[206,352]})+glint(600,389,13,gold);
 a+=photo(q,{x:102,y:446,w:996,h:918});
 const host=cfg.details?.honoree||c.subtitle;a+=T(host,600,1528,980,126,gold,{face:'script',lines:2,bounds:[1425,1600]});
 if(cfg.details?.honoree)a+=T(c.subtitle===cfg.details.honoree?'':c.subtitle,600,1664,955,28,d.ink,{face:'sans'});
 a+=L(425,1679,775,1679,d.accent)+T(c.date,600,1740,945,27,d.ink,{face:'sans',tracking:1});
 for(const [x,y,r]of [[155,134,15],[1126,356,15],[95,1597,11],[1059,1674,12]])a+=glint(x,y,r,gold);
 return finish(q,a);}
function confettiMoment(q){const {d,c,cfg,gold}=q;let a=begin(q);const colors=['#d89891','#718f97','#c4a364','#d5bfa3'];
 for(let i=0;i<32;i++){const x=i%2?1140+(i%3)*10:27+(i%3)*19,y=61+(i*97)%1670;a+=C(x,y,9+(i%5)*2,colors[i%4]);}
 for(const [x,y,r,col]of [[13,209,-28,'#d9a8a0'],[1078,118,28,'#9fb6b7'],[21,1638,-18,'#c9ae76']])a+=G(x,y,1,P('M-16 0 19-8 139 152 109 144 104 166Z',col),r);
 a+=T('Good People',417,212,651,142,d.ink,{face:'script'})+L(807,97,807,278,d.accent)+T('BRIGHT MOMENTS',992,160,293,32,d.ink,{face:'serif',lines:2})+tiny('BIG MEMORIES',992,238,305,d.accent);
 a+=photo(q,{x:125,y:354,w:950,h:1007});
 a+=name(c.title,600,1505,970,119,d.ink,{face:'serif',bounds:[1410,1610]})+footer(q,{y:1650});
 return finish(q,a);}
function quinceRoyal(q){
 const {d,c,cfg,gold,id}=q;
 let a=begin(q)+R(30,30,1140,1740,'none',d.ink,4,22)+R(48,48,1104,1704,'none',gold,3,16)+R(62,62,1076,1676,'none',d.accent,1,10);
 const crown=P('M-108-30-77 14-40-51 0 8 40-51 77 14 108-30 88 51H-88Z','none',gold,5)
  +P('M-85 51H85V70H-85Z',gold)+[-108,-40,40,108].map((x,i)=>C(x,i===0||i===3?-30:-51,7,gold)).join('')+C(0,8,7,gold);
 a+=`<g data-artwork="quince-crown">${G(600,115,.88,crown)}</g>`;
 a+=T('Mis XV',600,278,930,157,d.ink,{face:'script',lines:1})+L(440,310,760,310,d.accent,3)+glint(600,310,9,gold);
 for(const [x,y,s,rotation]of [[51,300,.35,-15],[1150,1450,.35,165]])
  a+=foliage(x,y,s,d.ink,d.accent,rotation);
 for(let i=0;i<12;i++){
  const y=350+i*88;
  a+=C(77,y,3.8,d.accent)+C(1123,y,3.8,d.accent);
 }
 const four=q.approvedFour,originals=four?(q.sample&&(!q.poses||q.poses.length===0)?null:validateShotSet(q.poses,4)):q.photo?[q.photo]:null;
 const cells=four?Array.from({length:4},(_,i)=>({x:108,y:350+i*267,w:984,h:239})):[{x:108,y:350,w:984,h:1040}];
 const fit=cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 const clips=cells.map((cell,i)=>`<clipPath id="${id}-quince-pose-${i+1}">${R(cell.x,cell.y,cell.w,cell.h,'white')}</clipPath>`).join('');
 const panels=cells.map((cell,i)=>{
  const content=originals?`<image data-guest-photo="true" data-pose="${i+1}" href="${esc(originals[i])}" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" preserveAspectRatio="${fit}" style="filter:${q.filter}"/>`
   :T(four?'PHOTO '+(i+1):'YOUR PHOTO',600,cell.y+cell.h/2+14,cell.w*.8,42,'#725584',{face:'sans',lines:1});
  return R(cell.x-6,cell.y-6,cell.w+12,cell.h+12,'none',gold,4)
   +`<g clip-path="url(#${id}-quince-pose-${i+1})">${R(cell.x,cell.y,cell.w,cell.h,'#d4c2e0')}${content}</g>`;
 }).join('');
 a+=`<g data-quince-photo-region="true" data-pose-count="${four?4:1}"><defs>${clips}</defs>${panels}</g>`;
 a+=name(c.title,600,1537,930,133,d.ink,{bounds:[1450,1645]})+L(405,1680,795,1680,d.accent,2)+T(c.date,600,1730,920,29,d.ink,{face:'sans',tracking:1});
 for(const [x,y,r]of [[108,1694,12],[1092,1694,12],[126,1420,8],[1074,1420,8]])a+=glint(x,y,r,gold);
 return finish(q,a);
}
export function renderCelebration(input,spec){const q=context(input,spec);return ({botanical:flowers,'evening-soiree':evening,'confetti-moment':confettiMoment,'quince-royal':quinceRoyal})[spec.layout](q);}
