import {context,begin,finish,R,P,L,T,G,C,label,tiny,name,photo,frame,glint,marble,footer} from './svg-kit.mjs';
function executive(q){const {d,c,gold,monogram}=q;let a=begin(q)+frame(gold);
 a+=T('BUILD BRIGHTER',401,137,604,92,d.ink,{face:'serif',lines:1})+T('TOGETHER',400,246,608,96,d.accent,{face:'serif'});
 a+=L(775,95,775,278,d.accent)+T(monogram,967,184,268,112,d.ink,{face:'serif'})+tiny('IN GOOD COMPANY',966,247,285,d.accent);
 a+=photo(q,{x:94,y:356,w:1012,h:1015});
 a+=tiny('LEAD · CONNECT · CREATE',600,1446,981,d.accent)+L(115,1491,1085,1491,d.accent);
 a+=name(c.title.toUpperCase(),539,1591,840,100,d.ink,{face:'serif',bounds:[1520,1660]})+T(c.subtitle,539,1690,826,30,d.ink,{face:'sans'});
 a+=P('M957 1500 1200 1240v560H681Z',d.ink)+P('M957 1500 1200 1240','none',gold,5)+tiny('PEOPLE',1070,1585,175,d.paper)+tiny('IDEAS',1070,1627,175,d.paper)+tiny('PROGRESS',1070,1669,175,d.paper);
 a+=T(c.date,525,1744,810,25,d.ink,{face:'sans',tracking:1});return finish(q,a);}
function gala(q){const {d,c,gold,monogram}=q;let a=begin(q)+marble('#444635',gold)+marble('#444635',gold,1);
 a+=tiny(c.title.toUpperCase(),600,137,941,d.ink)+name(c.subtitle||c.title,600,267,1010,136,gold,{face:'serif',bounds:[170,311]})+tiny('AN EVENING TO REMEMBER',600,354,940,d.ink);
 a+=photo(q,{x:100,y:418,w:1000,h:948});
 a+=tiny('PEOPLE · PURPOSE · POSSIBILITY',600,1450,916,gold)+L(160,1508,1040,1508,gold);
 a+=T(monogram,600,1601,300,95,gold,{face:'serif'})+T(c.title,600,1675,900,35,d.ink,{face:'sans',tracking:1.8})+T(c.date,600,1740,910,25,d.ink,{face:'sans',tracking:1.1});return finish(q,a);}
function summit(q){const {d,c,silver,monogram}=q;let a=begin(q)+P('M1200 1350v450H600Z','#375e74')+P('M1200 1350v37L665 1800h-40Z',silver);
 a+=T(monogram,188,172,210,111,silver,{face:'serif'})+L(335,97,335,285,d.accent)+name(c.title,744,174,743,102,d.ink,{face:'serif',bounds:[99,258]});
 a+=tiny('PEOPLE · IDEAS · IMPACT',600,317,960,d.ink)+photo(q,{x:96,y:390,w:1008,h:1000});
 a+=T(c.subtitle||'Together, in the moment',498,1530,817,83,d.ink,{face:'serif',lines:2,bounds:[1435,1601]})+L(100,1640,755,1640,d.accent)+T(c.date,466,1728,745,28,d.ink,{face:'sans',tracking:1});
 let buildings='';for(let i=0;i<8;i++){const x=864+i*41,h=55+i*33;buildings+=R(x,1800-h,32,h,i%2?'#7294a4':'#406578');for(let j=0;j<h/17-1;j++)buildings+=L(x+7,1800-h+11+j*17,x+25,1800-h+11+j*17,'#b8d0d8',1);}a+=`<g opacity=".85">${buildings}</g>`;
 return finish(q,a);}
export function renderCorporate(input,spec){const q=context(input,spec);return ({'executive-modern':executive,'corporate-gala':gala,'summit-modern':summit})[spec.layout](q);}
