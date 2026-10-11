// The owner's five sample photos are a presentation of these decorative themes.
// Print/preview masks every sample face with empty photo slots or actual captured
// guest photos. The same deterministic SVG goes to the staff proof and 4x6 printer.
import {isFprPrintPreset} from './fpr-print-presets.mjs';
import {art as graduationArt} from './generated/graduation-embedded.mjs';
import {art as weddingArt} from './generated/wedding-embedded.mjs';
import {art as birthdayArt} from './generated/birthday-embedded.mjs';
import {art as quinceArt} from './generated/quince-embedded.mjs';
import {art as corporateArt} from './generated/corporate-embedded.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const onlyPhoto=s=>typeof s==='string'&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)?s:'';
const limited=(v,max=65)=>String(v??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
const number=(n)=>Number(n.toFixed(2));
const rect=(x,y,w,h,fill,other='')=>`<rect x="${number(x)}" y="${number(y)}" width="${number(w)}" height="${number(h)}" fill="${fill}" ${other}/>`;
const themes={
 'fpr-graduation':{key:'graduation',ref:[420,746],src:graduationArt,bg:'#071b36',frame:'#efb73f',panels:[[32,120,355,160],[32,289,355,159],[32,456,355,155]],caption:'#fff0b2'},
 'fpr-wedding':{key:'wedding',ref:[420,1045],src:weddingArt,bg:'#e9e3d6',frame:'#f6f3e9',panels:[[35,156,350,283],[35,450,350,284]],caption:'#242e25'},
 'fpr-birthday':{key:'birthday',ref:[420,1012],src:birthdayArt,bg:'#e67dac',frame:'#ffc5dd',panels:[[32,102,346,207],[32,318,346,214],[32,538,346,206]],caption:'#fff9e2'},
 'fpr-quince':{key:'quince',ref:[420,1069],src:quinceArt,bg:'#d1a5e8',frame:'#bd85d4',panels:[[28,170,363,220],[28,401,363,220],[28,633,363,225]],caption:'#310952'},
 'fpr-corporate':{key:'corporate',ref:[420,1053],src:corporateArt,bg:'#070705',frame:'#f0c266',panels:[[22,144,375,229],[22,386,375,231],[22,630,375,230]],caption:'#fae3a1'},
};
const caption=(x,y,value,size,color,face='Georgia,serif',extra='')=>`<text x="${number(x)}" y="${number(y)}" text-anchor="middle" font-family="${face}" font-size="${Math.min(size,Math.floor(1050/(Math.max(1,String(value).length)*.6)))}" fill="${color}" paint-order="stroke" stroke-width="0.4" ${extra}>${esc(value)}</text>`;
export function renderFprPrint(input={}){
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{};
 const id=input.template||cfg.defaultTemplate;
 if(!isFprPrintPreset(id))throw new Error('Unsupported photo booth preset.');
 const theme=themes[id],four=input.layout==='photo_strip';
 const [refW,refH]=theme.ref;
 // The sample references are narrow strips, but an approved guest keepsake is
 // a whole 4x6 sheet. Extend the reference's left and right decorative edges at
 // their original aspect ratio instead of containing a strip between blank
 // sidebars or horizontally stretching its flowers, balloons and lettering.
 const scale=1800/refH,w=refW*scale;
 const sourceBand=([x,y,bw,bh],fill,other='')=>rect(x*scale,y*scale,1200-(refW-bw)*scale,bh*scale,fill,other);
 const idSafe=String(input.id||'fpr').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)||'fpr';
 const cropArt=([x,y,bw,bh])=>`<g data-fpr-emblem="true"><defs><clipPath id="${idSafe}-art-emblem">${rect(600-bw*scale/2,y*scale,bw*scale,bh*scale,'white')}</clipPath></defs><image href="${theme.src}" x="${number(600-(x+bw/2)*scale)}" y="0" width="${number(w)}" height="1800" preserveAspectRatio="xMinYMin meet" clip-path="url(#${idSafe}-art-emblem)"/></g>`;
 const name=limited(cfg.approvedPrintName||cfg.details?.eventName||cfg.title||'Your Celebration');
 const eventDay=limited(cfg.date||'',35);
 const year=/^\d{4}$/.test(cfg.details?.classYear||'')?cfg.details.classYear:(eventDay.match(/20\d\d/)||[''])[0];
 let used=[];
 if(four){
  if(!input.sample){if(!Array.isArray(input.poses)||input.poses.length!==4)throw new Error('Four distinct captured photographs are required.'); used=input.poses.map(onlyPhoto);if(used.some(v=>!v))throw new Error('A captured photo could not be read.');}
 }else if(input.photo){const one=onlyPhoto(input.photo);if(!one)throw new Error('The captured photograph could not be read.');used=[one];}
 // The reference artwork has two or three example photographs. Treat their
 // combined space as one photo area, so the guest's choice changes the actual
 // composition rather than repeating one image or squeezing two into a row.
 const left=Math.min(...theme.panels.map(panel=>panel[0])),top=Math.min(...theme.panels.map(panel=>panel[1]));
 const right=Math.max(...theme.panels.map(panel=>panel[0]+panel[2])),bottom=Math.max(...theme.panels.map(panel=>panel[1]+panel[3]));
 const x=left*scale,y=top*scale,pw=1200-(left+refW-right)*scale,ph=(bottom-top)*scale;
 const gap=four?12*scale:0,slotWidth=four?(pw-gap)/2:pw,slotHeight=four?(ph-gap)/2:ph;
 const fit=cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 let art=rect(0,0,1200,1800,theme.bg);
 art+=`<g data-fpr-sheet-artwork="true">${rect(0,0,1200,1800,theme.bg,'data-fpr-sheet-bounds="true"')}<defs><clipPath id="${idSafe}-art-left">${rect(0,0,600,1800,'white')}</clipPath><clipPath id="${idSafe}-art-right">${rect(600,0,600,1800,'white')}</clipPath></defs><image href="${theme.src}" x="0" y="0" width="${number(w)}" height="1800" preserveAspectRatio="xMinYMin meet" clip-path="url(#${idSafe}-art-left)"/><image href="${theme.src}" x="${number(1200-w)}" y="0" width="${number(w)}" height="1800" preserveAspectRatio="xMaxYMin meet" clip-path="url(#${idSafe}-art-right)"/></g>`;
 art+=rect(2,2,1196,1796,'none',`stroke="${theme.frame}" stroke-width="2"`);
 const panels=Array.from({length:four?4:1},(_,shot)=>{
  const px=x+(four?shot%2:0)*(slotWidth+gap),py=y+(four?Math.floor(shot/2):0)*(slotHeight+gap),src=used[shot];
  const bg=rect(px,py,slotWidth,slotHeight,theme.key==='corporate'?'#dddcd5':'#e2e3dd');
  const photo=src?`<image data-guest-photo="true" data-pose="${shot+1}" href="${esc(src)}" x="${number(px)}" y="${number(py)}" width="${number(slotWidth)}" height="${number(slotHeight)}" preserveAspectRatio="${fit}"/>`:
  `<path d="M${number(px+slotWidth*.08)} ${number(py+slotHeight)} Q${number(px+slotWidth*.23)} ${number(py+slotHeight*.62)} ${number(px+slotWidth*.50)} ${number(py+slotHeight*.61)} Q${number(px+slotWidth*.77)} ${number(py+slotHeight*.62)} ${number(px+slotWidth*.92)} ${number(py+slotHeight)}Z" fill="#bdc6c0"/><circle cx="${number(px+slotWidth*.5)}" cy="${number(py+slotHeight*.38)}" r="${number(Math.min(slotWidth*.14,slotHeight*.18))}" fill="#bec6be"/>`;
  return `<g data-approved-photo-region="true" data-pose="${shot+1}">${bg}${photo}${rect(px,py,slotWidth,slotHeight,'none',`stroke="${theme.frame}" stroke-width="${Math.max(2,scale*1.5).toFixed(1)}"`)}</g>`;
 }).join('');
 // Mask the whole original photo area, including every old divider. Empty
 // four-photo gutters therefore cannot reveal faces from the example artwork.
 const maskPadding=2*scale;
 art+=`<g data-fpr-preset-photo-areas="${four?'4':'1'}">${rect(x-maskPadding,y-maskPadding,pw+maskPadding*2,ph+maskPadding*2,theme.bg,'data-fpr-reference-mask="true"')}${panels}</g>`;
 // Replace example-specific names/dates and recenter each theme's heading.
 // Lettering and decorative emblems keep their proportions on the wider sheet.
 const rw=(value,max)=>limited(value,max);
 if(theme.key==='graduation'){
  art+=sourceBand([93,4,232,108],theme.bg);
  art+=caption(600,50*scale,'Class of',Math.round(33*scale),theme.caption,'Georgia,serif','font-style="italic"')+
   caption(600,95*scale,rw(year||'GRAD',8),Math.round(45*scale),'#ffffff');
  art+=sourceBand([145,614,130,52],theme.bg)+cropArt([145,614,130,52]);
  art+=sourceBand([59,668,301,77],theme.bg)+caption(600,701*scale,rw(name,30),Math.round((name.length>18?20:29)*scale),'#ffffff')+
   caption(600,722*scale,'THE FUTURE IS BRIGHT',Math.round(13*scale),'#ffffff','Arial,sans-serif');
 }else if(theme.key==='wedding'){
  art+=sourceBand([45,790,335,106],'#faf8f2');
  art+=caption(600,869*scale,'Mr. & Mrs.',Math.round(68*scale),theme.caption,'Georgia,serif','font-style="italic"');
  art+=sourceBand([80,896,260,59],'#faf8f2');
  art+=caption(600,919*scale,rw(name,34),Math.round((name.length>18?20:28)*scale),theme.caption);
  art+=caption(600,947*scale,rw(eventDay,30),Math.round(17*scale),theme.caption);
 }else if(theme.key==='quince'){
  art+=sourceBand([82,24,255,131],'#d8b3ef');
  art+=cropArt([145,25,126,50])+caption(600,139*scale,'Mis XV',Math.round(61*scale),'#310952','Georgia,serif','font-style="italic"');
  art+=sourceBand([53,886,315,147],'#d8b3ef');
  art+=caption(600,959*scale,rw(name,30),Math.round((name.length>17?35:57)*scale),'#310952','Georgia,serif','font-style="italic"');
  art+=caption(600,1011*scale,rw(eventDay,35),Math.round(20*scale),'#310952');
 }else if(theme.key==='corporate'){
  art+=sourceBand([147,7,126,66],'#030303')+cropArt([147,7,126,66]);
  art+=sourceBand([79,75,260,53],'#030303');
  art+=caption(600,108*scale,rw(name,30),Math.round((name.length>16?24:34)*scale),'#ffffff');
  art+=sourceBand([28,870,366,148],'#050505');
  art+=caption(600,951*scale,rw(name,30),Math.round((name.length>18?35:55)*scale),theme.caption,'Georgia,serif','font-style="italic"');
  art+=caption(600,1006*scale,rw(eventDay,34),Math.round(18*scale),theme.caption);
 }else if(theme.key==='birthday'){
  art+=sourceBand([99,22,221,62],'#e98bae')+caption(600,75*scale,'Celebrate!',Math.round(42*scale),theme.caption,'Georgia,serif','font-style="italic"');
  art+=sourceBand([88,754,244,28],'#e98bae');
  art+=caption(600,775*scale,rw(name,29),Math.round(25*scale),'#ffffff');
  art+=sourceBand([60,783,300,177],'#e98bae');
  art+=caption(600,859*scale,'Happy',Math.round(64*scale),'#ffffff','Georgia,serif','font-style="italic"')+caption(600,933*scale,'Birthday!',Math.round(67*scale),'#ffffff','Georgia,serif','font-style="italic"');
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" role="img" data-fpr-preset="${esc(theme.key)}" data-layout="${four?'photo_strip':'card'}" aria-label="${esc(name+' photo booth print')}" data-template-key="approved/${theme.key}">${art}</svg>`;
}
