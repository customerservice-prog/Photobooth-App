import {context,begin,finish,R,P,L,T,G,C,label,tiny,name,photo,frame,blooms,foliage,glint,dust,footer} from './svg-kit.mjs';
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
export function renderCelebration(input,spec){const q=context(input,spec);return ({botanical:flowers,'evening-soiree':evening,'confetti-moment':confettiMoment})[spec.layout](q);}
