// Stationery-quality artwork; the controls, storage and delivery flows are unchanged.
import {rose,faces} from './generated/atelier-assets.mjs';
export {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
import {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
const collections={
 wedding:[['Rosewater Romance','Painted roses · flowing calligraphy','botanical','#f7f1e7','#655044','#b19565'],['The Vow Edit','Fashion-editorial portrait · sculpted type','editorial','#f8f4ea','#442b35','#9d7a77'],['Black-Tie Heirloom','Ornate champagne frame · calligraphic names','deco','#182c29','#f5ecd7','#c3a671']],
 birthday:[['Champagne Birthday','Satin balloon bouquet · signature birthday seal','balloons','#f6e9dc','#824f52','#c69b60'],['Retro Party Club','Scalloped party ticket · oversized lettering','ticket','#f2d39c','#8d3d47','#aa583f'],['Midnight Disco','Faceted mirror ball · pearl and lilac','disco','#28233d','#f1e7f0','#d3bccf']],
 mitzvah:[['Mazel Tov Atelier','Architectural blue · celebrant calligraphy','jewel','#e7edf1','#244c65','#b19663'],['The Milestone Edit','Name-first editorial · crisp portrait','editorial','#f8f6ed','#295363','#799c9c'],['Sapphire Celebration','Heirloom ornament · sapphire and champagne','deco','#162c4c','#f5ecd7','#c7ae78']],
 graduation:[['Varsity Signature','Class-year masthead · graduate signature','varsity','#edece3','#263d5a','#b29a65'],['Honors & Heritage','Certificate engraving · laurel medallion','diploma','#f6f0e1','#4c5046','#a59065'],['The Graduate Edit','Full portrait · evening-gold masthead','spotlight','#202a3e','#f5edd7','#c7ab73']],
 corporate:[['The Brand Edit','High-fashion company masthead · full portrait','editorial','#f7f4eb','#283f44','#8e9f98'],['Executive Invitation','Sculpted corners · event-pass typography','badge','#e3eae3','#2c514d','#89a397'],['The Gala Collection','Champagne ornament · formal invitation','deco','#212d32','#f5efde','#bfa875']],
 other:[['Garden Soirée','Painted botanical corners · personal inscription','botanical','#f5f2e7','#476252','#a08e69'],['The Memory Edit','Instant-photo composition · calligraphic inscription','polaroid','#e7dcd4','#574d47','#a78872'],['Golden Gathering','Geometric invitation · warm champagne','jewel','#f0e8d5','#5a4c39','#ae925e']]
};
export function getDesigns(type='other'){return (Object.hasOwn(collections,type)?collections[type]:collections.other).map((d,i)=>({id:['ivory','blush','champagne'][i],name:d[0],description:d[1],layout:d[2],paper:d[3],ink:d[4],accent:d[5]}));}
export function getDesign(type,id){return getDesigns(type).find(d=>d.id===id)||getDesigns(type)[0];}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=v=>String(v??'').normalize('NFC').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,240);
const rect=(x,y,w,h,fill,stroke='none',sw=1,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const path=(d,stroke='none',sw=1,fill='none')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function measure(value,face,size,tracking=0){let pen=0,min=0,max=0;const font=faces[face],chars=[...value];for(let i=0;i<chars.length;i++){const g=font.glyphs[chars[i]];if(!g)return null;if(i)pen+=(font.kern[chars[i-1]+chars[i]]||0)*size/1000;min=Math.min(min,pen+(g.box?.x1||0)*size/1000);max=Math.max(max,pen+(g.box?.x2||g.advance)*size/1000);pen+=g.advance*size/1000+tracking;}return {width:Math.max(max,pen-tracking)-min,min};}
// Outlined glyphs keep calligraphy identical in the preview, SVG print and JPEG export.
function lettering(value,x,y,maxWidth,size,fill,{face='serif',tracking=0,lines=1}={}){
 value=clean(value);if(!value)return '';const font=faces[face];let m=measure(value,face,size,tracking);
 if(!m){const fitted=fitText(value,maxWidth,size,lines);return fitted.lines.map((s,i)=>`<text data-copy="${esc(value)}" x="${x}" y="${y+i*fitted.size*1.13}" font-family="Georgia, serif" font-size="${fitted.size}" fill="${fill}" text-anchor="middle" ${s.length*fitted.size*.6>maxWidth?`textLength="${maxWidth}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(s)}</text>`).join('');}
 const chunks=[value];if(lines>1&&m.width>maxWidth*1.22&&value.includes(' ')){const words=value.split(' ');let split=1,best=Infinity;for(let i=1;i<words.length;i++){const delta=Math.abs(measure(words.slice(0,i).join(' '),face,size,tracking).width-measure(words.slice(i).join(' '),face,size,tracking).width);if(delta<best){best=delta;split=i;}}chunks.splice(0,1,words.slice(0,split).join(' '),words.slice(split).join(' '));}
 const scale=Math.min(1,maxWidth/Math.max(...chunks.map(s=>measure(s,face,size,tracking).width)));size*=scale;tracking*=scale;
 return chunks.map((s,line)=>{const metrics=measure(s,face,size,tracking);let pen=x-metrics.width/2-metrics.min,art='';const chars=[...s];for(let i=0;i<chars.length;i++){const g=font.glyphs[chars[i]];if(i)pen+=(font.kern[chars[i-1]+chars[i]]||0)*size/1000;art+=`<path d="${g.path}" transform="translate(${pen.toFixed(2)} ${(y+line*size*1.10).toFixed(2)}) scale(${(size/1000).toFixed(6)})"/>`;pen+=g.advance*size/1000+tracking;}return `<g data-copy="${esc(s)}" aria-label="${esc(s)}" fill="${fill}">${art}</g>`;}).join('');
}
function sprig(x,y,s,rotation=0){return `<g transform="translate(${x} ${y}) rotate(${rotation}) scale(${s})"><image data-artwork="museum-rose" href="${rose}" x="0" y="0" width="436" height="637"/></g>`;}
function flourish(x,y,s,color,flip=1){return `<g transform="translate(${x} ${y}) scale(${s*flip} ${s})" fill="none" stroke="${color}" stroke-width="2"><path d="M0 160C70 160 62 80 25 75C-3 68-7 102 18 108C60 116 112 23 74 6C46-5 39 21 57 26C87 36 100 1 151 0M0 142C55 142 45 90 18 90M91 48C160 60 122 117 91 108C62 100 81 70 106 88M21 162C55 202 116 172 112 145C106 115 75 131 85 151C95 173 130 144 172 146M152 0C180 34 158 59 138 51C121 41 137 22 153 37"/><path d="M35 69q-38-15-24-45q29-2 34 31M75 70q26-38 52-20q-5 29-40 32M15 165q-21 24-5 44q27-12 20-41M120 144q19-36 44-23q-4 28-33 31" stroke-width="1.3"/><circle cx="2" cy="160" r="3" fill="${color}"/><circle cx="152" cy="0" r="3" fill="${color}"/></g>`;}
function ornateFrame(id,color){let a=rect(48,48,1104,1704,'none',color,2)+rect(63,63,1074,1674,'none',color,.8);for(const [x,y,sx,sy]of [[77,78,1,1],[1123,78,-1,1],[77,1722,1,-1],[1123,1722,-1,-1]])a+=`<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${flourish(0,0,1,color)}</g>`;return a;}
function laurel(x,y,s,color){return `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 78C-100 65-100-37-44-75M0 78C100 65 100-37 44-75',color,2)}${[-1,1].map(side=>Array.from({length:8},(_,i)=>{const t=i/7*Math.PI*.86+Math.PI*.10,xx=side*Math.sin(t)*67,yy=70-Math.cos(t)*135;return `<path d="M${xx} ${yy}q${side*26}-25 ${side*37}-11q-10 28-${side*37} 11" fill="${color}" opacity="${.6+i*.045}"/>`}).join('')).join('')}</g>`;}
function star(x,y,s,color){return `<g transform="translate(${x} ${y})">${path(`M0-${s}Q2-2 ${s} 0Q2 2 0 ${s}Q-2 2-${s} 0Q-2-2 0-${s}Z`,color,1,color)}</g>`;}
function balloon(x,y,s,color,id,tilt=0){return `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})">${path('M0 88C35 168-38 210 4 324','#a18b77',1.8)}<ellipse rx="65" ry="86" fill="url(#${id}-${color})" stroke="#fff5" stroke-width="1.5"/><ellipse cx="-21" cy="-29" rx="17" ry="28" fill="#fff" opacity=".16" transform="rotate(20)"/>${path('m0 82-9 14h18Z','none',1,'#b18a76')}<ellipse cx="-24" cy="-38" rx="5" ry="14" fill="#fff" opacity=".5" transform="rotate(20)"/></g>`;}
function mirror(x,y,r,id){return `<g transform="translate(${x} ${y})"><defs><clipPath id="${id}-ball"><circle r="${r}"/></clipPath><radialGradient id="${id}-chrome" cx="28%" cy="20%"><stop stop-color="#ffffff"/><stop offset=".48" stop-color="#d2c1d6"/><stop offset="1" stop-color="#73647e"/></radialGradient></defs><circle r="${r}" fill="url(#${id}-chrome)"/><g clip-path="url(#${id}-ball)">${Array.from({length:15},(_,j)=>Array.from({length:15},(_,i)=>{const a=-r+i*r*2/15,b=-r+j*r*2/15;return rect(a+1,b+1,r*2/15-3,r*2/15-3,(i*13+j*7)%5===0?'#ffffff90':'#ffffff10','#ece9f0',.7,1)}).join('')).join('')}</g></g>`;}
function stripes(color){return `<g stroke="${color}" fill="none" opacity=".25">${Array.from({length:8},(_,i)=>path(`M${20+i*6} 50V1750M${1180-i*6} 50V1750`,color,1)).join('')}</g>`;}
function gridAccent(color){return path('M66 360 240 104h720l174 256v930l-174 155H240L66 1290ZM85 359l163-235h704l163 235v925l-163 139H248L85 1284Z',color,2);}
export function renderKeepsake({photo='',cfg={},monogram='',template='ivory',filter='none',id='card'}={}){
 const c=eventCopy(cfg),d=getDesign(c.type,template),l=d.layout;id=String(id).replace(/[^a-zA-Z0-9_-]/g,'')||'card';
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)&&photo!=='/print-test.svg')photo='';
 if(!['none','brightness(1.08) contrast(.96) saturate(.88)','grayscale(1) contrast(1.08) brightness(1.04)','sepia(.18) saturate(.92) brightness(1.03)'].includes(filter))filter='none';
 const gold=`url(#${id}-foil)`,night=['deco','disco','spotlight'].includes(l);let b={x:110,y:235,w:980,h:1030,rx:0},nameY=1515,nameSize=150,nameFace='script',headY=151,capY=1655;
 if(l==='botanical'){b={x:145,y:145,w:910,h:1080,rx:0};headY=1320;nameY=1510;nameSize=169;}
 if(l==='editorial'){b={x:50,y:290,w:1100,h:1065,rx:0};headY=180;nameY=1560;nameFace=c.type==='wedding'?'script':'serif';nameSize=151;}
 if(l==='deco'){b={x:125,y:285,w:950,h:1000,rx:0};headY=208;nameY=1480;nameSize=159;}
 if(l==='balloons'){b={x:156,y:330,w:888,h:915,rx:34};headY=213;nameY=1480;nameSize=181;}
 if(l==='ticket'){b={x:120,y:345,w:960,h:885,rx:24};headY=210;nameFace='serif';nameY=1480;nameSize=181;}
 if(l==='disco'){b={x:112,y:315,w:976,h:955,rx:0};headY=193;nameY=1500;nameSize=174;}
 if(l==='jewel'){b={x:125,y:290,w:950,h:975,rx:0};headY=185;nameY=1495;nameSize=155;}
 if(l==='varsity'){b={x:75,y:350,w:1050,h:960,rx:0};headY=224;nameY=1510;nameSize=164;}
 if(l==='diploma'){b={x:130,y:220,w:940,h:980,rx:0};headY=160;nameY=1495;nameSize=160;}
 if(l==='spotlight'){b={x:50,y:285,w:1100,h:1050,rx:0};headY=175;nameY=1540;nameSize=154;}
 if(l==='badge'){b={x:94,y:205,w:1012,h:1070,rx:22};headY=134;nameY=1475;nameSize=141;nameFace='serif';}
 if(l==='polaroid'){b={x:85,y:100,w:1030,h:1170,rx:0};headY=1350;nameY=1510;nameSize=168;}
 const {x,y,w,h,rx}=b,shape=rect(x,y,w,h,'#fff','none',0,rx);
 let art=rect(0,0,1200,1800,d.paper)+`<defs><clipPath id="${id}-photo">${shape}</clipPath><linearGradient id="${id}-foil" x1="0" x2="1" y1=".1" y2=".9"><stop stop-color="#9f7d40"/><stop offset=".28" stop-color="#ddc48b"/><stop offset=".47" stop-color="#fff0ba"/><stop offset=".65" stop-color="#b39555"/><stop offset="1" stop-color="#d8bd81"/></linearGradient>${[['pink','#f8decf','#c79087'],['gold','#fff1c6','#b39556'],['sage','#e1e5d2','#a5ae8d']].map(([n,a,b])=>`<radialGradient id="${id}-${n}" cx="28%" cy="18%"><stop stop-color="${a}"/><stop offset=".6" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('')}</defs>`;
 if(l==='botanical')art+=rect(42,42,1116,1716,'none','#cdbfa3',1.4)+rect(x-18,y-18,w+36,h+36,'none',gold,3);
 if(l==='deco')art+=ornateFrame(id,gold);
 if(l==='ticket')art+=path('M66 58H1134V1260Q1060 1320 1134 1380V1742H66V1380Q140 1320 66 1260Z',d.ink,4)+path('M104 1320H1096',d.ink,2)+stripes(d.accent);
 if(l==='jewel')art+=gridAccent(gold);
 if(l==='varsity')art+=rect(0,0,1200,302,d.ink)+stripes(d.accent);
 if(l==='diploma')art+=rect(43,43,1114,1714,'none',gold,3)+rect(57,57,1086,1686,'none',d.accent,1)+laurel(600,1360,.65,d.accent);
 if(l==='badge')art+=rect(0,1320,1200,480,d.ink)+rect(533,42,134,21,d.ink,'none',0,10)+rect(65,170,1070,1134,'none',d.accent,1.5,35);
 if(l==='polaroid')art+=rect(40,40,1120,1720,'#faf6ee');
 if(l==='disco'){art+=mirror(975,115,225,id)+mirror(62,1460,140,id);for(const [sx,sy,ss]of [[111,120,28],[930,1420,18],[1085,1600,25],[245,148,12]])art+=star(sx,sy,ss,gold);}
 const fit=photo==='/print-test.svg'||cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 const placeholder=rect(x,y,w,h,'#d9d6cd')+path(`M${x} ${y+h}Q${x+w/2} ${y+h*.15} ${x+w} ${y+h}Z`,'none',1,'#b0b6ac')+`<circle cx="${x+w/2}" cy="${y+h*.33}" r="${w*.15}" fill="#c1c6bc"/>`;
 art+=`<g clip-path="url(#${id}-photo)">${rect(x,y,w,h,night?'#364242':'#e8e2d5')}${photo?`<image data-guest-photo="true" href="${esc(photo)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" style="filter:${filter}"/>`:placeholder}</g>`;
 if(l!=='editorial'&&l!=='polaroid')art+=rect(x-7,y-7,w+14,h+14,'none',gold,1.7,rx);
 if(l==='botanical')art+=sprig(-99,-32,.69,-9)+sprig(1090,1204,.61,159)+path('M320 1690H880',d.accent,1);
 if(l==='balloons'){for(const [bx,by,bs,bc,bt]of [[104,286,1.0,'pink',-13],[209,202,.9,'gold',12],[1144,1115,.83,'pink',10],[1090,251,.65,'sage',12],[55,396,.58,'sage',-14]])art+=balloon(bx,by,bs,bc,id,bt);}
 if(l==='spotlight')art+=path('M0 46H1200M50 1380H1150',gold,3)+laurel(1095,1510,.28,gold);
 if(l==='polaroid')art+=`<g transform="rotate(-9 190 82)">${rect(55,42,275,80,'#c2ad8fbb')}</g>`;
 const footerInk=l==='badge'?d.paper:d.ink,headerInk=l==='varsity'?d.paper:d.ink;
 if(l==='editorial'){
  const masthead=c.type==='wedding'?'THE VOW EDIT':c.type==='corporate'?c.title.toUpperCase():'THE MILESTONE';
  art+=lettering(masthead,600,headY,1070,c.type==='corporate'?126:148,headerInk,{face:'serif',tracking:2});
  art+=lettering(c.type==='wedding'?'TOGETHER IS A BEAUTIFUL PLACE TO BE':c.eyebrow.toUpperCase(),600,248,1040,23,d.accent,{face:'sans',tracking:3});
 }else if(l==='balloons'){art+=lettering('Happy Birthday',600,headY,710,123,d.ink,{face:'script'});}
 else if(l==='ticket'){art+=lettering('PARTY CLUB',600,headY,870,133,d.ink,{face:'serif',tracking:4})+lettering('ONE UNFORGETTABLE NIGHT',600,277,810,25,d.ink,{face:'sans',tracking:4});}
 else if(l==='varsity'){art+=lettering(c.eyebrow.toUpperCase(),600,headY,1030,144,headerInk,{face:'serif',tracking:2});}
 else if(l==='disco'){art+=lettering(c.type==='birthday'?'LET’S CELEBRATE':c.eyebrow.toUpperCase(),518,headY,890,67,d.ink,{face:'serif',tracking:2});}
 else if(l==='deco'){art+=lettering(monogram||c.title.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join(''),600,165,210,93,gold,{face:'serif'})+lettering(c.eyebrow.toUpperCase(),600,241,730,26,d.ink,{face:'sans',tracking:5});}
 else art+=lettering(c.eyebrow.toUpperCase(),600,headY,965,30,headerInk,{face:'sans',tracking:4});
 if(['botanical','deco','jewel'].includes(l))art+=flourish(460,nameY-176,.29,d.accent)+flourish(740,nameY-176,.29,d.accent,-1);
 art+=lettering(c.title,600,nameY,1010,nameSize,footerInk,{face:nameFace,lines:2});
 art+=lettering(c.subtitle,600,capY,980,31,footerInk,{face:'sans',tracking:.65})+lettering(c.date,600,1731,980,27,footerInk,{face:'sans',tracking:1.2});
 if(c.type==='birthday'&&c.seal){const ax=l==='ticket'?1035:l==='disco'?152:1040,ay=l==='ticket'?1394:l==='disco'?1390:1390;art+=`<circle cx="${ax}" cy="${ay}" r="72" fill="${d.ink}" stroke="${gold}" stroke-width="3"/><circle cx="${ax}" cy="${ay}" r="61" fill="none" stroke="${d.paper}" stroke-width="1"/>`+lettering(c.seal,ax,ay+24,110,79,d.paper,{face:'serif'});}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(d.name+' — '+c.title)}" data-design="${c.type}-${d.id}" data-layout="${l}" data-collection="atelier"><title>${esc(c.title)}</title>${art}</svg>`;
}
