// One self-contained stationary composition for previews, JPEG export and the printed card.
export const EVENT_LABELS={wedding:'Wedding',birthday:'Birthday',mitzvah:'Bar / Bat Mitzvah',graduation:'Graduation',corporate:'Corporate',other:'Other celebration'};
const packs={
 wedding:[['Botanical Vows','Engraved florals · heirloom paper','botanical','#f7f2e8','#344339','#a18b66'],['Wedding Editorial','Full-bleed portrait · oversized names','editorial','#f8f6ee','#272d2b','#8a9484'],['Gilded Promises','Champagne foil detail · evening elegance','deco','#252c2b','#f6f0df','#beab7d']],
 birthday:[['Balloon Bouquet','Satin balloons · personalized age','balloons','#f2e5d8','#754b48','#b17b69'],['Birthday Backstage','Birthday ticket · bold typography','ticket','#e8c59b','#3c3c4d','#ae665c'],['Disco Celebration','Mirrored disco · soft lilac','disco','#e5dfeb','#504064','#a69aab']],
 mitzvah:[['Modern Mazel','Sculpted geometry · blue and gold','jewel','#e9eef0','#294c63','#b09358'],['Celebrant Spotlight','Portrait editorial · name in focus','editorial','#f7f6ed','#285160','#91aeaa'],['Golden Milestone','Teal evening frame · golden details','deco','#23494b','#f5f1dc','#c4ad78']],
 graduation:[['Varsity Honors','Class-year masthead · school spirit','varsity','#edece4','#293c53','#ac9569'],['The Next Chapter','Engraved diploma · graduate seal','diploma','#f6f0df','#3e4841','#af9064'],['Graduate Spotlight','Editorial portrait · midnight and gold','spotlight','#263244','#f6efdc','#c9b580']],
 corporate:[['Brand Editorial','Full-bleed photograph · brand masthead','editorial','#f7f7f1','#263e43','#8b9d98'],['Conference Pass','Modern event pass · split color','badge','#e3e9e2','#2b4944','#8ca9a0'],['Evening Gala','Formal black tie · champagne accents','deco','#293236','#f5f0e5','#bbab7e']],
 other:[['Botanical Gathering','Botanical letterpress · personal caption','botanical','#f3f1e7','#465b4e','#a88d70'],['The Good Times','Instant-photo keepsake · handwritten feel','polaroid','#e6e3dc','#47443f','#af8875'],['A Golden Occasion','Architectural frame · warm gold','jewel','#eee5d2','#595043','#af8e58']]
};
export function getDesigns(type='other'){return (Object.hasOwn(packs,type)?packs[type]:packs.other).map((d,i)=>({id:['ivory','blush','champagne'][i],name:d[0],description:d[1],layout:d[2],paper:d[3],ink:d[4],accent:d[5]}));}
export function getDesign(type,id){return getDesigns(type).find(d=>d.id===id)||getDesigns(type)[0];}
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,240);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function eventCopy(cfg={}){const type=Object.hasOwn(EVENT_LABELS,cfg.type)?cfg.type:'other',d=cfg.details||{};let title=clean(cfg.title)||'Your celebration',subtitle=clean(cfg.subtitle),eyebrow=EVENT_LABELS[type],seal='';
 if(type==='wedding'){if(d.partner1&&d.partner2)title=clean(d.partner1)+' & '+clean(d.partner2);eyebrow='THE WEDDING';if(d.venue)subtitle=clean(d.venue);}
 if(type==='birthday'){if(d.honoree)title=clean(d.honoree);eyebrow='HAPPY BIRTHDAY';seal=/^\d{1,3}$/.test(d.age||'')?d.age:'';if(d.theme)subtitle=clean(d.theme);}
 if(type==='mitzvah'){if(d.honoree)title=clean(d.honoree);eyebrow=clean(d.mitzvahType)||'MITZVAH CELEBRATION';if(d.hebrewName)subtitle=clean(d.hebrewName)+' · Mazel tov';}
 if(type==='graduation'){if(d.graduate)title=clean(d.graduate);eyebrow=d.classYear?'CLASS OF '+clean(d.classYear):'GRADUATION';seal=/^\d{4}$/.test(d.classYear||'')?d.classYear:'';if(d.school)subtitle=clean(d.school);}
 if(type==='corporate'){if(d.company)title=clean(d.company);eyebrow='TOGETHER, IN THE MOMENT';if(d.eventName)subtitle=clean(d.eventName);}
 return {type,title,subtitle,eyebrow,date:clean(cfg.date),seal};}
const units=t=>[...t].reduce((a,c)=>a+(/[ilI1 .,']/u.test(c)?.3:/[MW@&]/u.test(c)?.95:/[^\u0000-\u024f]/u.test(c)?1:.59),0);
export function fitText(value,width,size,maxLines=2){const text=clean(value);if(!text)return {lines:[],size};
 const wrap=s=>{const lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&units(next)*s>width){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;};
 let lines=wrap(size);while((lines.length>maxLines||lines.some(l=>units(l)*size>width))&&size>24){size-=2;lines=wrap(size);}if(lines.length>maxLines){if(maxLines===1)lines=[text];else lines=[lines.slice(0,-1).join(' '),lines.at(-1)];}return {lines,size};}
function type(value,x,y,width,size,color,{lines=2,sans=false,italic=false,bold=false,spacing=0}={}){const f=fitText(value,width,size,lines);return f.lines.map((l,i)=>`<text x="${x}" y="${y+i*f.size*1.12}" text-anchor="middle" fill="${color}" font-family="${sans?'Arial, sans-serif':'Georgia, serif'}" font-size="${f.size}" font-weight="${bold?'700':'400'}" font-style="${italic?'italic':'normal'}" letter-spacing="${spacing}" ${units(l)*f.size+spacing*l.length>width?`textLength="${width}" lengthAdjust="spacingAndGlyphs"`:''}>${esc(l)}</text>`).join('');}
const rect=(x,y,w,h,fill,stroke='none',sw=2,rx=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const path=(d,stroke,sw=2,fill='none')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
// Fine engraved botanical artwork: curved leaves, peony petals and a delicate stem network.
function botanical(x,y,scale,flip=1){const c='#81917e',rose='#b08d86';return `<g transform="translate(${x} ${y}) scale(${scale*flip} ${scale})">${path('M0 270C-35 160 20 90 0 0M-2 165C-65 120-75 60-112 40M0 108C78 50 80-15 125-55',c,3)}${[[-5,235,-35],[-8,190,18],[-49,111,-30],[-78,70,-65],[47,54,30],[76,17,60],[3,58,-30],[106,-23,30]].map(([a,b,r])=>`<g transform="translate(${a} ${b}) rotate(${r})">${path('M0 0C-32-23-34-62-6-94C20-62 28-27 0 0Z',c,1.4,'#bdc7b5')}${path('M-6-90Q3-50 0 0M-15-67 0-47M-17-42 0-24M10-60 0-42',c,1)}</g>`).join('')}<g transform="translate(-6 -22)">${[0,45,90,135,180,225,270,315].map((a,i)=>`<g transform="rotate(${a})">${path(`M0 0C${-63-i} -12 -91 -74 -38 -99C10-117 47-60 0 0Z`,rose,1.8,i%2?'#ead6cb':'#f0e1d4')}${path('M-31-88C-53-50-18-15 0 0M-44-79Q-66-48-8-9',rose,.9)}</g>`).join('')}${[0,72,144,216,288].map(a=>`<g transform="rotate(${a})">${path('M0 0C-26-7-40-43-9-53C18-60 31-23 0 0Z',rose,1.4,'#e8c9be')}</g>`).join('')}<circle r="11" fill="#ab8c63"/>${[0,60,120,180,240,300].map(a=>`<path d="M0 0V-14" transform="rotate(${a})" stroke="#fbf2dc" stroke-width="1.5"/>`).join('')}</g></g>`;}
function balloon(x,y,s,color,id){return `<g transform="translate(${x} ${y}) scale(${s})">${path('M0 77C45 170-42 207 0 300','#a49281',2)}<ellipse rx="59" ry="78" fill="url(#${id}-${color})"/>${path('m0 73-8 14h16Z','none',0,'#b99387')}<ellipse cx="-23" cy="-27" rx="7" ry="21" transform="rotate(25 -23 -27)" fill="#fff" opacity=".35"/></g>`;}
function ringSeal(x,y,c){return `<g transform="translate(${x} ${y})" stroke="${c}" fill="none" stroke-width="2.4"><ellipse cx="-15" cy="3" rx="20" ry="24" transform="rotate(-18)"/><ellipse cx="15" cy="3" rx="20" ry="24" transform="rotate(18)"/>${path('m-25-22 9-10 9 10m0-4 7-8 9 11',c,2)}</g>`;}
function cap(x,y,c){return `<g transform="translate(${x} ${y})">${path('m-54 0 54-21L54 0 0 22-54 0Zm19 14v27q35 18 70 0V14M54 0v60m-5 0v14h10V60',c,3)}</g>`;}
function mirrorBall(x,y,r,id){return `<g transform="translate(${x} ${y})">${path('M0 -'+r+'V-'+(r+70),'#7c758a',2)}<defs><clipPath id="${id}-mirror"><circle r="${r}"/></clipPath><radialGradient id="${id}-silver" cx="25%" cy="20%"><stop stop-color="#fff"/><stop offset=".5" stop-color="#d3cedb"/><stop offset="1" stop-color="#8f879e"/></radialGradient></defs><circle r="${r}" fill="url(#${id}-silver)"/><g clip-path="url(#${id}-mirror)" fill="none" stroke="#f4f3f8" stroke-width="2">${[-.72,-.38,0,.38,.72].map(f=>`<path d="M-${r} ${r*f}H${r}"/><ellipse rx="${Math.max(5,r*(1-Math.abs(f)))}" ry="${r}"/>`).join('')}</g></g>`;}
function sparkle(x,y,s,c){return `<g transform="translate(${x} ${y})">${path(`M0-${s}Q2-2 ${s} 0Q2 2 0 ${s}Q-2 2-${s} 0Q-2-2 0-${s}Z`,c,1,c)}</g>`;}
export function renderKeepsake({photo='',cfg={},monogram='',template='ivory',filter='none',id='card'}={}){
 const c=eventCopy(cfg),d=getDesign(c.type,template);id=String(id).replace(/[^a-zA-Z0-9_-]/g,'')||'card';
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)&&photo!=='/print-test.svg')photo='';
 const allowed=['none','brightness(1.08) contrast(.96) saturate(.88)','grayscale(1) contrast(1.08) brightness(1.04)','sepia(.18) saturate(.92) brightness(1.03)'];if(!allowed.includes(filter))filter='none';
 const l=d.layout,night=['deco','spotlight'].includes(l);let b={x:85,y:205,w:1030,h:1055,rx:0},headY=120,headSize=36,nameY=1430,nameSize=112,captionY=1620;
 if(l==='botanical'){b={x:126,y:126,w:948,h:1115,rx:0};headY=1340;nameY=1470;nameSize=112;}
 if(l==='editorial'){b={x:0,y:0,w:1200,h:1310,rx:0};headY=1376;nameY=1510;nameSize=113;}
 if(l==='deco'){b={x:105,y:200,w:990,h:1060,rx:0};headY=135;nameY=1460;}
 if(l==='balloons'){b={x:120,y:255,w:960,h:1010,rx:26};headY=164;nameY=1445;}
 if(l==='ticket'){b={x:120,y:290,w:960,h:1000,rx:0};headY=155;nameY=1460;}
 if(l==='disco'){b={x:94,y:250,w:1012,h:1010,rx:8};headY=170;nameY=1460;nameSize=124;}
 if(l==='jewel'){b={x:130,y:230,w:940,h:1060,rx:0};headY=145;nameY=1470;}
 if(l==='varsity'){b={x:90,y:275,w:1020,h:1030,rx:0};headY=168;headSize=64;nameY=1465;}
 if(l==='diploma'){b={x:115,y:235,w:970,h:1040,rx:0};headY=160;nameY=1455;}
 if(l==='spotlight'){b={x:65,y:230,w:1070,h:1090,rx:0};headY=155;nameY=1490;}
 if(l==='badge'){b={x:100,y:200,w:1000,h:1100,rx:18};headY=125;nameY=1480;}
 if(l==='polaroid'){b={x:75,y:95,w:1050,h:1160,rx:0};headY=0;nameY=1430;nameSize=122;}
 const {x,y,w,h,rx}=b,cut=l==='jewel';const shape=cut?path(`M${x+45} ${y}H${x+w-45}l45 45v${h-90}l-45 45H${x+45}l-45-45V${y+45}Z`,'none',0,'#fff'):rect(x,y,w,h,'#fff','none',0,rx);
 let art=rect(0,0,1200,1800,d.paper)+`<defs><clipPath id="${id}-photo">${shape}</clipPath>${[['pink','#f4d9cb','#be8f86'],['gold','#f3e1b6','#b69563'],['sage','#d6dec9','#9ba78f']].map(([n,a,b])=>`<radialGradient id="${id}-${n}" cx="25%" cy="20%"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`).join('')}</defs>`;
 if(l==='polaroid')art+=rect(30,35,1140,1730,'#faf8f0');
 if(l==='badge')art+=rect(0,1340,1200,460,d.ink);
 if(l==='varsity')art+=rect(0,0,1200,225,d.ink);
 if(l==='ticket')art+=path('M50 50H1150V1300Q1080 1335 1150 1370V1750H50V1370Q120 1335 50 1300Z',d.ink,3)+path('M85 1338H1115',d.accent,2);
 const fit=photo==='/print-test.svg'||cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 art+=`<g clip-path="url(#${id}-photo)">${rect(x,y,w,h,night?'#373c3b':'#e1e1d7')}${photo?`<image href="${esc(photo)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}" style="filter:${filter}"/>`:`${rect(x,y,w,h,'#d3d5ce')}${path(`M${x} ${y+h}Q${x+w/2} ${y+h*.22} ${x+w} ${y+h}Z`,'none',0,'#a7b2aa')}<circle cx="${x+w/2}" cy="${y+h*.35}" r="${w*.17}" fill="#bbc4bc"/>${type('YOUR PHOTO',x+w/2,y+h*.88,w*.8,26,'#52635b',{sans:true,lines:1,spacing:5})}`}</g>`;
 if(l!=='editorial')art+=rect(x-9,y-9,w+18,h+18,'none',d.accent,1.5,rx);
 if(l==='botanical')art+=rect(36,36,1128,1728,'none','#cebea3',1.5)+botanical(68,270,.78)+botanical(1140,1195,.65,-1);
 if(l==='deco')art+=path('M52 248V52H248M952 52h196v196M52 1552v196h196m704 0h196v-196M69 214V69h145m772 0h145v145M69 1586v145h145m772 0h145v-145',d.accent,2)+(c.type==='wedding'?ringSeal(600,1330,d.accent):sparkle(600,1328,18,d.accent));
 if(l==='balloons')art+=balloon(84,277,.85,'pink',id)+balloon(1135,1170,.72,'gold',id)+balloon(1134,225,.6,'sage',id);
 if(l==='disco')art+=mirrorBall(1080,151,73,id)+sparkle(90,1365,20,d.accent)+sparkle(1086,1460,18,d.accent);
 if(l==='jewel')art+=path('M80 240 210 90h780l130 150v1090l-130 90H210l-130-90Z',d.accent,2)+path('M50 300V200L200 60h800l150 140v100',d.accent,1);
 if(l==='diploma')art+=rect(40,40,1120,1720,'none',d.accent,3)+rect(53,53,1094,1694,'none',d.accent,1)+cap(600,1335,d.accent);
 if(l==='spotlight')art+=path('M0 0H1200V32H0ZM0 1320 1200 1270v17L0 1337Z','none',0,d.accent);
 if(l==='varsity')art+=path('M35 0v1800m1130-1800v1800',d.accent,3)+cap(600,1350,d.accent);
 if(l==='badge')art+=rect(525,35,150,19,d.ink,'none',0,9)+rect(40,82,1120,1250,'none',d.accent,2,28);
 if(l==='polaroid')art+=path('M87 40h210v67H87Z','none',0,'#d2c6ae')+path('M945 1710h160',d.accent,2);
 const headerColor=l==='varsity'?d.paper:d.ink,footerColor=l==='badge'?d.paper:d.ink;
 if(headY)art+=type((c.type==='corporate'&&l==='editorial'?c.title:c.eyebrow).toUpperCase(),600,headY,l==='disco'?850:1000,headSize,headerColor,{sans:true,bold:l==='varsity',lines:1,spacing:l==='varsity'?2:5});
 const nameFit=fitText(c.title,1000,nameSize,2);const baseY=nameFit.lines.length>1?nameY-18:nameY;
 art+=type(c.title,600,baseY,1000,nameFit.size,footerColor,{sans:['ticket','varsity','badge'].includes(l),bold:l==='ticket',italic:['botanical','balloons','disco','polaroid'].includes(l)});
 const nameEnd=baseY+(nameFit.lines.length-1)*nameFit.size*1.12;
 const capY=Math.max(captionY,Math.min(1655,nameEnd+65));
 art+=type(c.subtitle,600,capY,990,35,footerColor,{sans:true,lines:1})+type(c.date,600,1735,990,30,footerColor,{sans:true,lines:1,spacing:1.4});
 if(c.type==='birthday'&&c.seal){const ax=l==='disco'?140:1000,ay=l==='ticket'?210:1360;art+=`<circle cx="${ax}" cy="${ay}" r="64" fill="${d.ink}" stroke="${d.accent}" stroke-width="2"/>`+type(c.seal,ax,ay+23,108,62,d.paper,{sans:true,bold:true,lines:1});}
 if(l==='editorial'){art+=path('M90 1770H1110',d.accent,1);}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(d.name+' — '+c.title)}" data-design="${c.type}-${d.id}" data-layout="${l}">${art}</svg>`;
}
