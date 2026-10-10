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
const caption=(x,y,value,size,color,face='Georgia,serif')=>`<text x="${number(x)}" y="${number(y)}" text-anchor="middle" font-family="${face}" font-size="${size}" fill="${color}" paint-order="stroke" stroke-width="0.4">${esc(value)}</text>`;
export function renderFprPrint(input={}){
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{};
 const id=input.template||cfg.defaultTemplate;
 if(!isFprPrintPreset(id))throw new Error('Unsupported photo booth preset.');
 const theme=themes[id],four=input.layout==='photo_strip';
 const [refW,refH]=theme.ref;
 const scale=Math.min(1200/refW,1800/refH),w=refW*scale,h=refH*scale,ox=(1200-w)/2,oy=(1800-h)/2;
 const pos=([x,y,bw,bh])=>[ox+x*scale,oy+y*scale,bw*scale,bh*scale];
 const rectOnArt=([x,y,bw,bh],fill,other='')=>rect(...pos([x,y,bw,bh]),fill,other);
 const idSafe=String(input.id||'fpr').replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)||'fpr';
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
 const [x,y,pw,ph]=pos([left,top,right-left,bottom-top]);
 const gap=four?12*scale:0,slotHeight=(ph-gap*(four?3:0))/(four?4:1);
 const fit=cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 let art=rect(0,0,1200,1800,theme.bg);
 // A narrow metallic line on the 4x6 paper surrounds the original vertical theme,
 // preserving the supplied artwork's aspect ratio instead of stretching faces/type.
 art+=`<image href="${theme.src}" x="${number(ox)}" y="${number(oy)}" width="${number(w)}" height="${number(h)}" preserveAspectRatio="none"/>`;
 art+=rect(ox+2,oy+2,w-4,h-4,'none',`stroke="${theme.frame}" stroke-width="2"`);
 const panels=Array.from({length:four?4:1},(_,shot)=>{
  const py=y+shot*(slotHeight+gap),src=used[shot];
  const bg=rect(x,py,pw,slotHeight,theme.key==='corporate'?'#dddcd5':'#e2e3dd');
  const photo=src?`<image data-guest-photo="true" data-pose="${shot+1}" href="${esc(src)}" x="${number(x)}" y="${number(py)}" width="${number(pw)}" height="${number(slotHeight)}" preserveAspectRatio="${fit}"/>`:
  `<path d="M${number(x+pw*.08)} ${number(py+slotHeight)} Q${number(x+pw*.23)} ${number(py+slotHeight*.62)} ${number(x+pw*.50)} ${number(py+slotHeight*.61)} Q${number(x+pw*.77)} ${number(py+slotHeight*.62)} ${number(x+pw*.92)} ${number(py+slotHeight)}Z" fill="#bdc6c0"/><circle cx="${number(x+pw*.5)}" cy="${number(py+slotHeight*.38)}" r="${number(Math.min(pw*.14,slotHeight*.18))}" fill="#bec6be"/>`;
  return `<g data-approved-photo-region="true" data-pose="${shot+1}">${bg}${photo}${rect(x,py,pw,slotHeight,'none',`stroke="${theme.frame}" stroke-width="${Math.max(2,scale*1.5).toFixed(1)}"`)}</g>`;
 }).join('');
 // Mask the whole original photo area, including every old divider. Empty
 // four-photo gutters therefore cannot reveal faces from the example artwork.
 const maskPadding=2*scale;
 art+=`<g data-fpr-preset-photo-areas="${four?'4':'1'}">${rect(x-maskPadding,y-maskPadding,pw+maskPadding*2,ph+maskPadding*2,theme.bg,'data-fpr-reference-mask="true"')}${panels}</g>`;
 // Replace example-specific printed names/dates with this event's actual details.
 // Generic headings and decorations remain as shown in the reference samples.
 const rw=(value,max)=>limited(value,max);
 if(theme.key==='graduation'){
  art+=rectOnArt([93,4,232,108],theme.bg);
  art+=caption(ox+210*scale,oy+50*scale,'Class of',Math.round(33*scale),theme.caption,'Georgia,serif')+
   caption(ox+210*scale,oy+95*scale,rw(year||'GRAD',8),Math.round(45*scale),'#ffffff');
  art+=rectOnArt([59,668,301,77],theme.bg)+caption(ox+210*scale,oy+701*scale,rw(name,24),Math.round((name.length>18?15:22)*scale),'#ffffff')+
   caption(ox+210*scale,oy+722*scale,'THE FUTURE IS BRIGHT',Math.round(13*scale),'#ffffff','Arial,sans-serif');
 }else if(theme.key==='wedding'){
  art+=rectOnArt([80,896,260,59],'#faf8f2');
  art+=caption(ox+210*scale,oy+919*scale,rw(name,28),Math.round((name.length>18?14:17)*scale),theme.caption);
  art+=caption(ox+210*scale,oy+942*scale,rw(eventDay,30),Math.round(16*scale),theme.caption);
 }else if(theme.key==='quince'){
  art+=rectOnArt([53,886,315,147],'#d8b3ef');
  art+=caption(ox+210*scale,oy+959*scale,rw(name,25),Math.round((name.length>17?28:45)*scale),'#310952');
  art+=caption(ox+210*scale,oy+1011*scale,rw(eventDay,35),Math.round(20*scale),'#310952');
 }else if(theme.key==='corporate'){
  art+=rectOnArt([79,75,260,53],'#030303');
  art+=caption(ox+210*scale,oy+108*scale,rw(name,30),Math.round((name.length>16?20:29)*scale),'#ffffff');
  art+=rectOnArt([28,870,366,148],'#050505');
  art+=caption(ox+210*scale,oy+951*scale,rw(name,26),Math.round((name.length>18?25:39)*scale),theme.caption);
  art+=caption(ox+210*scale,oy+1006*scale,rw(eventDay,34),Math.round(18*scale),theme.caption);
 }else if(theme.key==='birthday'){
  art+=rectOnArt([88,754,244,28],'#e98bae');
  art+=caption(ox+210*scale,oy+775*scale,rw(name,29),Math.round(17*scale),'#ffffff');
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" role="img" data-fpr-preset="${esc(theme.key)}" data-layout="${four?'photo_strip':'card'}" aria-label="${esc(name+' photo booth print')}" data-template-key="approved/${theme.key}">${art}</svg>`;
}
