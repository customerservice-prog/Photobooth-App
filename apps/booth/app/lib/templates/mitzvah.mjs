import {context,begin,finish,R,P,L,T,C,G,label,tiny,name,photo,frame,foliage,starOfDavid,glint,marble,footer} from './svg-kit.mjs';
function timeless(q){const {d,c,gold}=q;let a=begin(q)+frame(gold);
 a+=foliage(74,275,.78,'#294351','#bdac7c',-18)+foliage(1125,1665,.81,'#294351','#bdac7c',162);
 a+=starOfDavid(600,118,38,gold)+L(325,116,514,116,d.accent)+L(686,116,875,116,d.accent);
 a+=name(c.title,600,277,865,125,d.ink,{face:'serif',bounds:[178,311]})+label(c.eyebrow.toUpperCase(),600,355,950,d.accent);
 a+=photo(q,{x:115,y:420,w:970,h:930});
 a+=tiny('FAMILY · FRIENDS · MEMORIES',600,1452,935,d.accent)+L(512,1510,688,1510,d.accent);
 a+=footer(q,{y:1595});return finish(q,a);}
function modern(q){const {d,c,gold}=q;let a=begin(q)+marble('#365367',gold)+marble('#345363',gold,1);
 a+=P('M0 230 325 0h28L0 258Z',gold)+P('M1200 1560 894 1800h-30L1200 1532Z',gold);
 a+=tiny('A NIGHT TO CELEBRATE',600,151,940,d.ink)+name(c.title,600,287,965,147,gold,{face:'serif',bounds:[199,336]})+label(c.eyebrow.toUpperCase(),600,382,940,d.ink);
 a+=photo(q,{x:100,y:443,w:1000,h:932});
 a+=L(440,1466,532,1466,gold)+glint(600,1466,16,gold)+L(668,1466,760,1466,gold)+tiny('GOOD PEOPLE · BRIGHT FUTURES',600,1531,930,d.ink);
 a+=footer(q,{y:1638});return finish(q,a);}
function mosaic(q){const {d,c,gold}=q;let a=begin(q)+R(20,20,1160,1760,'none',d.accent,1);
 const colors=['#74405e','#a97585','#d7b3ae','#e4c6b6'];
 for(let corner=0;corner<4;corner++){
  const tileId=q.id+'-mosaic-'+corner;
  let tiles='';for(let row=0;row<4;row++)for(let col=0;col<4;col++){
   const x=col*74,y=row*74;
   tiles+=P(`M${x+2} ${y+2}h70l-70 70Z`,colors[(row+col)%4],gold,1.2)+P(`M${x+73} ${y+3}v70h-70Z`,colors[(row*2+col+1)%4],gold,1.2);
  }
  const shape='M0 0H298A298 298 0 0 1 0 298Z';
  const mosaic=`<defs><clipPath id="${tileId}">${P(shape,'white')}</clipPath></defs><g clip-path="url(#${tileId})">${tiles}</g>${P(shape,'none',gold,3)}`;
  a+=`<g transform="translate(${corner%2?1200:0} ${corner>1?1800:0}) scale(${corner%2?-1:1} ${corner>1?-1:1})">${mosaic}</g>`;
 }
 a+=label('LET THE GOOD TIMES SHINE',600,139,880,d.ink)+starOfDavid(88,467,31,gold)+starOfDavid(1112,467,31,gold);
 a+=photo(q,{x:166,y:220,w:868,h:1100,shape:'arch'});
 for(const [x,y,r]of [[100,760,14],[1100,910,15],[99,1220,11],[1100,1370,11]])a+=glint(x,y,r,d.accent);
 a+=name(c.title,600,1492,970,158,d.ink,{bounds:[1385,1570]})+label(c.eyebrow.toUpperCase(),600,1620,920,d.accent)+T(c.subtitle,600,1674,920,26,d.ink,{face:'sans'})+T(c.date,600,1734,930,27,d.ink,{face:'sans',tracking:1.1});
 return finish(q,a);}
export function renderMitzvah(input,spec){const q=context(input,spec);return ({'timeless-classic':timeless,'modern-luxe':modern,'celebration-mosaic':mosaic})[spec.layout](q);}
