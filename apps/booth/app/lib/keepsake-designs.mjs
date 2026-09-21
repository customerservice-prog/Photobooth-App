// One deterministic, self-contained artwork source for the preview, thumbnails and 4x6 print.
export const EVENT_LABELS={wedding:'Wedding',birthday:'Birthday',mitzvah:'Bar / Bat Mitzvah',graduation:'Graduation',corporate:'Corporate',other:'Other celebration'};
const packs={
 wedding:[['Botanical Vows','Arched portrait · botanical illustration','botanical','#f6f1e7','#3f5044','#bd9971'],['Wedding Editorial','Magazine masthead · clean portrait','editorial','#faf8f3','#262c29','#85938b'],['Gilded Promises','Art-deco geometry · linked rings','deco','#233d3b','#fff8e6','#c7aa70']],
 birthday:[['Balloon Bouquet','Sculpted balloons · birthday seal','balloons','#f7eee6','#584342','#bf7867'],['Birthday Backstage','Celebration ticket · bold name','ticket','#f1d4af','#473c51','#b65e65'],['Disco Celebration','Mirror ball · starburst portrait','disco','#ddd9e8','#473e64','#817894']],
 mitzvah:[['Modern Mazel','Architectural frame · blue geometry','jewel','#e9eef0','#294d63','#b29357'],['Celebrant Spotlight','Editorial portrait · name first','editorial','#f9f7ef','#2c5261','#7ca8ac'],['Golden Milestone','Teal arch · gilded celebration','deco','#264e53','#fff5dc','#cbb575']],
 graduation:[['Varsity Honors','Class-year banner · school details','varsity','#eef0e8','#273d5b','#b19653'],['The Next Chapter','Diploma border · graduation cap','diploma','#f7f0df','#45504a','#b39a66'],['Graduate Spotlight','Diagonal gold · editorial portrait','spotlight','#263344','#f8f5e9','#cfb877']],
 corporate:[['Brand Editorial','Company masthead · sharp portrait','editorial','#f6f6f1','#243f48','#6e9092'],['Conference Pass','Modern badge · split color blocks','badge','#e4eae4','#294b49','#769a92'],['Evening Gala','Dark paper · fine gold geometry','deco','#293438','#faf5e9','#bcab7d']],
 other:[['Botanical Gathering','Leaf-lined arch · personal caption','botanical','#f4f1e7','#465b4e','#a88d70'],['The Good Times','Instant-photo layout · handwritten feel','polaroid','#e8e5de','#474544','#af8875'],['A Golden Occasion','Geometric keepsake · timeless type','jewel','#eee5d2','#595043','#af8e58']]
};
export function getDesigns(type='other'){return (packs[type]||packs.other).map((d,i)=>({id:['ivory','blush','champagne'][i],name:d[0],description:d[1],layout:d[2],paper:d[3],ink:d[4],accent:d[5]}));}
export function getDesign(type,id){return getDesigns(type).find(x=>x.id===id)||getDesigns(type)[0];}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,240);
export function eventCopy(cfg={}){
 const type=EVENT_LABELS[cfg.type]?cfg.type:'other',d=cfg.details||{};
 let title=clean(cfg.title)||'Your celebration',subtitle=clean(cfg.subtitle),eyebrow=EVENT_LABELS[type],seal='';
 if(type==='wedding'){if(d.partner1&&d.partner2)title=clean(d.partner1)+' & '+clean(d.partner2);eyebrow='THE WEDDING';if(d.venue)subtitle=clean(d.venue);}
 if(type==='birthday'){if(d.honoree)title=clean(d.honoree);eyebrow='HAPPY BIRTHDAY';seal=/^\d{1,3}$/.test(d.age||'')?d.age:'';if(d.theme)subtitle=clean(d.theme);}
 if(type==='mitzvah'){if(d.honoree)title=clean(d.honoree);eyebrow=clean(d.mitzvahType)||'MITZVAH CELEBRATION';if(d.hebrewName)subtitle=clean(d.hebrewName)+' · Mazel tov';}
 if(type==='graduation'){if(d.graduate)title=clean(d.graduate);eyebrow=d.classYear?'CLASS OF '+clean(d.classYear):'GRADUATION';seal=/^\d{4}$/.test(d.classYear||'')?d.classYear:'';if(d.school)subtitle=clean(d.school);}
 if(type==='corporate'){if(d.company)title=clean(d.company);eyebrow='TOGETHER, IN THE MOMENT';if(d.eventName)subtitle=clean(d.eventName);}
 return {type,title,subtitle,eyebrow,date:clean(cfg.date),seal};
}
// Conservative width estimate, with textLength only as a final guard for unusual scripts.
function units(t){return [...t].reduce((n,c)=>n+(/[ilI1 .,']/u.test(c)?.29:/[MW@&]/u.test(c)?.88:/[^\u0000-\u024f]/u.test(c)?1:.57),0);}
export function fitText(text,width,size,maxLines=2){
 text=clean(text);if(!text)return {lines:[],size};
 const wrap=s=>{const out=[];let line='';for(const word of text.split(/\s+/)){const trial=line?line+' '+word:word;if(line&&units(trial)*s>width){out.push(line);line=word;}else line=trial;}if(line)out.push(line);return out;};
 let lines=wrap(size);while((lines.length>maxLines||lines.some(l=>units(l)*size>width))&&size>24){size-=2;lines=wrap(size);}if(lines.length>maxLines){lines=[lines.slice(0,-1).join(' '),lines.at(-1)];}
 return {lines,size};
}
function text(value,x,y,width,size,color,opts={}){
 const f=fitText(value,width,size,opts.lines||2),gap=f.size*1.15;
 return f.lines.map((line,i)=>`<text x="${x}" y="${y+i*gap}" text-anchor="${opts.align||'middle'}" fill="${color}" font-family="${opts.sans?'Arial, sans-serif':'Georgia, serif'}" font-size="${f.size}" font-weight="${opts.bold?'700':'400'}" font-style="${opts.italic?'italic':'normal'}" ${units(line)*f.size>width?`textLength="${width}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(line)}</text>`).join('');
}
const rect=(x,y,w,h,fill,stroke='none',sw=2,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line=(x1,y1,x2,y2,color,sw=2)=>`<path d="M${x1} ${y1}H${x2}" transform="${y1===y2?'':`rotate(${Math.atan2(y2-y1,x2-x1)*180/Math.PI} ${x1} ${y1})`}" fill="none" stroke="${color}" stroke-width="${sw}"/>`;
function flower(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-15 30Q-110-40-155-100M0 35Q-130 80-150 170M10 20Q90-70 145-110" fill="none" stroke="#7d907b" stroke-width="3"/>${[[-110,-65,-35],[-70,-28,15],[85,-48,60],[-100,105,25],[-135,145,70]].map(([a,b,r])=>`<ellipse cx="${a}" cy="${b}" rx="16" ry="40" transform="rotate(${r} ${a} ${b})" fill="#91a28a"/>`).join('')}${[[0,0,1],[-55,55,.63],[50,45,.58]].map(([a,b,z])=>`<g transform="translate(${a} ${b}) scale(${z})">${[0,60,120,180,240,300].map(r=>`<ellipse cx="0" cy="-23" rx="29" ry="42" transform="rotate(${r})" fill="#dcafa5" stroke="#c9908c" stroke-width="1.5"/>`).join('')}<circle r="29" fill="#f1ccc0"/><path d="M-17 2Q-14-21 9-17Q30 3 5 18Q-15 25-11 0Q4-10 12 5" fill="none" stroke="#c18987" stroke-width="3"/></g>`).join('')}</g>`;}
function rings(x,y,color){return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="4"><circle cx="-24" cy="5" r="30"/><circle cx="24" cy="5" r="30"/><path d="m-39-23 15-18 15 18M9-23l15-18 15 18"/></g>`;}
function cap(x,y,color){return `<g transform="translate(${x} ${y})" stroke="${color}" stroke-width="4" fill="none"><path d="m-70 0 70-30L70 0 0 30-70 0ZM-40 18v27q40 22 80 0V18M70 0v68m-6-2v18h12V66"/></g>`;}
function diamond(x,y,size,color){return `<path d="m${x} ${y-size} ${size} ${size}-${size} ${size}-${size}-${size}Z" fill="none" stroke="${color}" stroke-width="3"/>`;}
function balloons(x,y,s,id){return `<g transform="translate(${x} ${y}) scale(${s})">${[[-43,30,'pink'],[38,10,'gold'],[0,-70,'green']].map(([a,b,c])=>`<path d="M${a} ${b+72}Q${a+30} ${b+175} 0 245" fill="none" stroke="#a38c79" stroke-width="2"/><ellipse cx="${a}" cy="${b}" rx="50" ry="66" fill="url(#${id}-${c})"/><path d="m${a} ${b+63}-7 12h14Z" fill="#ac8b7f"/><ellipse cx="${a-17}" cy="${b-24}" rx="8" ry="21" fill="#fff" opacity=".3" transform="rotate(25 ${a-17} ${b-24})"/>`).join('')}</g>`;}
function disco(x,y,r,id){return `<g transform="translate(${x} ${y})"><path d="M0-${r}V-${r+100}" stroke="#7f788c" stroke-width="3"/><defs><clipPath id="${id}-ball"><circle r="${r}"/></clipPath><radialGradient id="${id}-chrome" cx="30%" cy="25%"><stop stop-color="#fff"/><stop offset=".65" stop-color="#c9c7d2"/><stop offset="1" stop-color="#807a91"/></radialGradient></defs><circle r="${r}" fill="url(#${id}-chrome)"/><g clip-path="url(#${id}-ball)" fill="none" stroke="#eeeef5" stroke-width="3">${[-.7,-.35,0,.35,.7].map(f=>`<ellipse rx="${Math.max(4,r*(1-Math.abs(f)))}" ry="${r}"/><path d="M-${r} ${r*f}H${r}"/>`).join('')}</g></g>`;}
function decorations(d,c,id){
 const a=d.accent;
 switch(d.layout){
 case 'botanical':return flower(147,350,.85)+flower(1050,1210,.82)+(c.type==='wedding'?rings(600,1385,a):diamond(600,1385,22,a));
 case 'balloons':return balloons(155,300,1.05,id)+balloons(1040,1110,.82,id)+[150,400,650,900,1050].map((x,i)=>diamond(x,75+(i%2)*45,7,a)).join('');
 case 'ticket':return `<path d="M75 75H1125V630Q1070 660 1125 690V1760H75V690Q130 660 75 630Z" fill="none" stroke="${a}" stroke-width="5" stroke-dasharray="10 12"/>`+text('ADMIT ONE · CELEBRATE',600,175,940,30,a,{sans:true,lines:1});
 case 'disco':return disco(1020,200,100,id)+`<g fill="none" stroke="${a}" stroke-width="2" opacity=".45">${Array.from({length:13},(_,i)=>`<path d="M600 1000  ${60+i*90} 50"/>`).join('')}</g>`+diamond(140,280,23,a)+diamond(1045,1330,25,a);
 case 'deco':return `<path d="M80 220V80H220M980 80h140v140M80 1580v140h140m760 0h140v-140M105 245V105h140m710 0h140v140M105 1555v140h140m710 0h140v-140" fill="none" stroke="${a}" stroke-width="3"/>`+diamond(600,160,38,a)+(c.type==='wedding'?rings(600,1380,a):diamond(600,1375,24,a));
 case 'jewel':return `<path d="M90 360 240 210h720l150 150v900l-150 150H240L90 1260ZM55 310l185-170h720l185 170" fill="none" stroke="${a}" stroke-width="3"/>`+diamond(600,115,34,a);
 case 'varsity':return rect(0,0,1200,285,d.ink)+text(c.eyebrow,600,190,980,90,d.paper,{sans:true,bold:true,lines:1})+cap(600,1330,a);
 case 'diploma':return rect(60,60,1080,1680,'none',a,4)+rect(83,83,1034,1634,'none',a,1)+cap(600,190,a)+`<path d="m975 1520-20 140 55-30 45 40-25-160" fill="${a}"/><circle cx="1010" cy="1500" r="57" fill="${a}"/><circle cx="1010" cy="1500" r="43" fill="none" stroke="${d.paper}" stroke-width="2"/>`;
 case 'spotlight':return `<path d="M0 180 1200 0v90L0 270ZM0 1450 1200 1330v35L0 1485Z" fill="${a}"/>`+cap(980,175,a);
 case 'badge':return rect(0,1300,1200,500,d.ink)+rect(530,55,140,28,d.ink,'none',0,14)+rect(50,90,1100,1200,'none',a,3,22);
 case 'polaroid':return `<g transform="translate(85 70) rotate(-8 100 30)">${rect(0,0,220,75,'#bcad8d','none',0)}<path d="M10 5v65m15-65v65m15-65v65m15-65v65m15-65v65" stroke="#d0c6ae" stroke-width="2"/></g>`;
 default:return line(90,240,1110,240,a)+line(90,1440,1110,1440,a);
 }
}
export function renderKeepsake({photo='',cfg={},monogram='',template='ivory',filter='none',id='card'}={}){
 const c=eventCopy(cfg),d=getDesign(c.type,template);id=String(id).replace(/[^a-zA-Z0-9_-]/g,'')||'card';
 // Only local test art and in-memory raster photos; never fetch arbitrary guest-controlled URLs.
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)&&photo!=='/print-test.svg')photo='';
 const allowedFilters=['none','brightness(1.08) contrast(.96) saturate(.88)','grayscale(1) contrast(1.08) brightness(1.04)','sepia(.18) saturate(.92) brightness(1.03)'];if(!allowedFilters.includes(filter))filter='none';
 let box={x:100,y:290,w:1000,h:970,shape:'rect',rx:0},titleY=1490,titleSize=74,headlineY=180,titleColor=d.ink,captionY=1640;
 if(d.layout==='botanical'){box={x:175,y:150,w:850,h:1130,shape:'arch'};headlineY=1320;}
 if(d.layout==='editorial'){box={x:90,y:300,w:1020,h:1110,shape:'rect',rx:0};titleY=1530;}
 if(d.layout==='deco'){box={x:130,y:300,w:940,h:990,shape:'step'};headlineY=245;}
 if(d.layout==='balloons')box={x:205,y:285,w:790,h:1010,shape:'round',rx:100};
 if(d.layout==='ticket'){box={x:140,y:370,w:920,h:870,shape:'round',rx:30};headlineY=280;titleY=1450;}
 if(d.layout==='disco'){box={x:150,y:325,w:900,h:1000,shape:'arch'};headlineY=220;titleY=1465;}
 if(d.layout==='jewel'){box={x:155,y:305,w:890,h:1020,shape:'cut'};headlineY=200;titleY=1510;}
 if(d.layout==='varsity'){box={x:105,y:335,w:990,h:915,shape:'rect',rx:0};headlineY=0;}
 if(d.layout==='diploma'){box={x:140,y:310,w:920,h:960,shape:'rect',rx:0};headlineY=270;titleSize=70;}
 if(d.layout==='spotlight'){box={x:95,y:345,w:1010,h:1035,shape:'rect',rx:0};headlineY=290;titleY=1550;titleSize=70;captionY=1690;}
 if(d.layout==='badge'){box={x:100,y:190,w:1000,h:1070,shape:'round',rx:24};headlineY=142;titleY=1460;titleColor=d.paper;}
 if(d.layout==='polaroid'){box={x:90,y:140,w:1020,h:1170,shape:'rect',rx:0};headlineY=0;titleY=1445;}
 const {x,y,w,h}=box;
 const shape=box.shape==='arch'?`<path d="M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z"/>`:box.shape==='step'?`<path d="M${x} ${y+50}h50v-50h${w-100}v50h50v${h-100}h-50v50H${x+50}v-50H${x}Z"/>`:box.shape==='cut'?`<path d="M${x+55} ${y}h${w-110}l55 55v${h-110}l-55 55H${x+55}l-55-55V${y+55}Z"/>`:rect(x,y,w,h,'#fff','none',0,box.rx||0);
 const defs=`<defs><clipPath id="${id}-photo">${shape}</clipPath>${[['pink','#dba99f','#b47777'],['gold','#edd3a1','#bb9963'],['green','#b8c4ad','#7e9389']].map(([n,a,b])=>`<radialGradient id="${id}-${n}" cx="28%" cy="20%"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('')}</defs>`;
 const photoArt=photo?`<image href="${esc(photo)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${photo==='/print-test.svg'?'xMidYMid meet':'xMidYMid slice'}" style="filter:${filter}"/>`:`${rect(x,y,w,h,'#c6cfca')}<path d="M${x} ${y+h}V${y+h*.8}Q${x+w*.5} ${y+h*.45} ${x+w} ${y+h*.8}V${y+h}Z" fill="#8b9d98"/><circle cx="${x+w*.5}" cy="${y+h*.39}" r="${w*.16}" fill="#adbab4"/>${text('PHOTO PREVIEW',x+w/2,y+h*.89,w*.8,24,'#334d46',{sans:true,lines:1})}`;
 // Ornamental graphics stay on paper; no animation or moving overlay is rendered.
 let art=rect(0,0,1200,1800,d.paper)+defs;
 if(d.layout==='polaroid')art+=rect(40,55,1120,1680,'#fbf9f3');
 if(d.layout==='disco')art+=decorations(d,c,id);
 art+=`<g clip-path="url(#${id}-photo)">${photoArt}</g>`;
 art+=`<g fill="none" stroke="${d.accent}" stroke-width="2">${shape.replace(/fill="[^"]*"/g,'fill="none"')}</g>`;
 if(d.layout!=='disco')art+=decorations(d,c,id);
 if(headlineY)art+=text((c.type==='corporate'&&d.layout==='editorial'?c.title:c.eyebrow).toUpperCase(),600,headlineY,950,d.layout==='editorial'?64:30,d.ink,{sans:true,bold:d.layout==='editorial',lines:1});
 if(d.layout==='editorial')art+=text(c.type==='wedding'?'a day to remember':'a moment to keep',600,230,900,30,d.accent,{italic:true,lines:1});
 const titleValue=c.type==='corporate'&&d.layout==='editorial'?(c.subtitle||c.title):c.title;
 const title=fitText(titleValue,970,titleSize,2);art+=text(titleValue,600,titleY,970,title.size,titleColor,{italic:['botanical','polaroid','disco'].includes(d.layout),sans:['badge','varsity','ticket','editorial'].includes(d.layout),bold:['ticket','varsity'].includes(d.layout)});
 const nextY=Math.max(captionY,titleY+Math.max(title.lines.length,1)*title.size*1.15+35);
 art+=text(c.type==='corporate'&&d.layout==='editorial'?'Thank you for being part of it':c.subtitle,600,Math.min(nextY,1670),970,28,titleColor,{sans:true,lines:1});
 art+=text(c.date,600,d.layout==='diploma'?1690:1730,950,25,titleColor,{sans:true,lines:1});
 if(c.seal&&c.type==='birthday')art+=`<circle cx="${d.layout==='disco'?180:1000}" cy="${d.layout==='ticket'?1360:d.layout==='disco'?170:160}" r="78" fill="${d.ink}" stroke="${d.accent}" stroke-width="4"/>`+text(c.seal,d.layout==='disco'?180:1000,d.layout==='ticket'?1380:d.layout==='disco'?192:182,125,64,d.paper,{sans:true,bold:true,lines:1});
 if(monogram&&d.layout==='polaroid')art+=text(monogram,1020,1640,130,28,d.accent,{italic:true,lines:1});
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(d.name+' — '+c.title)}" data-design="${c.type}-${d.id}" data-layout="${d.layout}">${art}</svg>`;
}
