// The same self-contained 4x6 SVG powers on-screen proofs, printing and JPEG delivery.
// Each column uses the original poses in order, not the already-composited card.
import {lettering} from './atelier-lettering.mjs';
import {eventCopy} from './keepsake-model.mjs';
import {safeHex,validateShotSet} from './photo-strip.mjs';
import {normalizePrintLayouts,getStripDesign} from './print-layouts.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,fill,stroke='none',sw=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function contrast(hex){const c=hex.slice(1).match(/../g).map(h=>{const n=parseInt(h,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722>.4?'#172d26':'#fffdf7';}
export function stripPhotoCells(total,fullWidth=false){
 if(![3,4].includes(total))throw new Error('A photo strip needs three or four original poses.');
 const top=205,bottom=1568,gap=12,h=(bottom-top-gap*(total-1))/total;
 return Array.from({length:total},(_,i)=>({x:fullWidth?28:28,y:top+i*(h+gap),w:fullWidth?1144:544,h}));
}
export function renderClassicPhotoStrip({poses,cfg={},template='ivory',stripMode,sample=false}={}){
 const rules=normalizePrintLayouts(cfg.printLayouts),design=getStripDesign(template),copy=eventCopy(cfg);
 const total=[3,4].includes(Number(cfg.printPackage?.shotsPerSession))?Number(cfg.printPackage.shotsPerSession):4;
 const shots=sample&&(!poses||poses.length===0)?null:validateShotSet(poses,total);
 const mode=(stripMode||rules.stripMode)==='double'?'double':'single',columns=mode==='double'?[0,600]:[150],fullWidth=false,mid=mode==='single'?450:300,width=mode==='single'?900:600;
 const primary=rules.useEventColors?safeHex(cfg.details?.primaryColor,'#24352f'):'#232824';
 const accent=rules.useEventColors?safeHex(cfg.details?.secondaryColor,'#d8c49b'):'#777777';
 const paper=design.id==='blush'?'#17241f':'#fffdf7',ink=design.id==='blush'?'#fffdf7':primary;
 const title=String(copy.title||cfg.title||'Our Celebration').slice(0,160);
 const person=cfg.type==='other'?String(cfg.details?.honoree||''):'';
 const caption=rules.footerText||(cfg.type==='other'?cfg.details?.subtitle:'')||copy.subtitle||'';
 const footer=[person,caption].filter(Boolean).join(' · '),headline=rules.stripHeadline||'A MOMENT TO KEEP';
 const text=(value,y,maxWidth,size,fill=ink,options={})=>lettering(value,mid,y,maxWidth,size,fill,{face:'sans',...options});
 let column=rect(0,0,width,1800,paper)+rect(10,10,width-20,1780,'none',accent,1.3);
 if(design.id==='champagne')column+=rect(10,10,width-20,164,primary);
 column+=`<circle cx="36" cy="50" r="4" fill="${accent}"/><circle cx="${width-36}" cy="50" r="4" fill="${accent}"/>`;
 column+=text(headline,58,width-100,18,design.id==='champagne'?contrast(primary):ink,{tracking:2.4});
 column+=text(title,119,width-90,fullWidth?53:42,design.id==='champagne'?contrast(primary):ink,{face:'serif',lines:2,bounds:[100,190]});
 for(const [i,baseCell] of stripPhotoCells(total,fullWidth).entries()){
  const cell=mode==='single'?{...baseCell,w:844}:baseCell;
  column+=rect(cell.x-4,cell.y-4,cell.w+8,cell.h+8,accent)+rect(cell.x,cell.y,cell.w,cell.h,design.id==='blush'?'#243b32':'#e9e8df');
  column+=shots?`<image data-guest-photo="true" data-pose="${i+1}" href="${esc(shots[i])}" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" preserveAspectRatio="${cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice'}"/>`:
   text(String(i+1).padStart(2,'0'),cell.y+cell.h*.53,cell.w-30,70,'#476051',{face:'serif'})+text('YOUR POSE',cell.y+cell.h*.75,cell.w-30,17,'#476051',{tracking:3});
  column+=`<g aria-hidden="true"><rect x="${cell.x+8}" y="${cell.y+8}" width="38" height="26" rx="13" fill="${ink}" opacity=".84"/><text x="${cell.x+27}" y="${cell.y+26}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${paper}">${String(i+1).padStart(2,'0')}</text></g>`;
 }
 column+=text(footer,1631,width-90,fullWidth?28:25,ink,{lines:2,bounds:[1600,1670]});
 column+=`<path d="M${mid-110} 1701H${mid+110}" stroke="${accent}" stroke-width="1.5"/>`;
 column+=text(copy.date||cfg.date||'',1732,width-90,24,ink)+text('FRIENDLY PHOTO BOOTH',1774,width-90,13,ink,{tracking:2});
 const art=columns.map((x,i)=>`<g data-strip-copy="${i+1}" transform="translate(${x} 0)">${column}</g>`).join('');
 // Single mode gives guests larger photos on a dedicated 4×6 keepsake.
 // Double mode preserves the traditional paired 2×6 layout.
 const singleMat=mode==='single'?[
  rect(0,0,1200,1800,paper),
  rect(22,22,1156,1756,'none',accent,3),
  rect(40,40,1120,1720,'none',accent,1),
  '<g opacity=".28">',
  '<path d="M110 130 Q300 60 490 130 M710 130 Q900 60 1090 130 M110 1670 Q300 1740 490 1670 M710 1670 Q900 1740 1090 1670" fill="none" stroke="'+accent+'" stroke-width="4"/>',
  '</g>',
  '<g fill="'+accent+'" opacity=".85"><circle cx="150" cy="900" r="9"/><circle cx="1050" cy="900" r="9"/><circle cx="150" cy="870" r="3"/><circle cx="1050" cy="870" r="3"/></g>',
  '<g stroke="'+accent+'" fill="none" stroke-width="3"><path d="M150 260V760 M1050 260V760 M150 1040V1540 M1050 1040V1540"/></g>',
  '<g fill="'+ink+'" font-family="Georgia,serif" text-anchor="middle" opacity=".82"><text x="85" y="825" font-size="18" transform="rotate(-90 85 825)">A MOMENT TO KEEP</text><text x="1115" y="825" font-size="18" transform="rotate(90 1115 825)">MADE FOR YOU</text></g>',
  '<g stroke="'+accent+'" stroke-width="2" fill="none"><path d="M100 100h100 M100 100v100 M1100 100h-100 M1100 100v100 M100 1700h100 M100 1700v-100 M1100 1700h-100 M1100 1700v-100"/></g>'
 ].join(''):'';
 const guide=mode==='double'&&rules.showCutGuide?'<path data-cut-guide="true" d="M600 42V1758" stroke="#b9b9ad" stroke-width="1" stroke-dasharray="5 10"/><g aria-hidden="true" fill="#85857c" font-family="Arial,sans-serif" font-size="10" letter-spacing="2"><text x="600" y="28" text-anchor="middle">CUT HERE</text><text x="600" y="1788" text-anchor="middle">CUT HERE</text></g>':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(design.name+' photo strip — '+title)}" data-collection="photo-strips" data-layout="photo_strip" data-strip-mode="${mode}" data-pose-count="${total}" data-design="strip-${design.id}"><title>${esc(title+' — '+(mode==='double'?'two matching photo strips':'single photo strip'))}</title>${rect(0,0,1200,1800,'#ffffff')}${singleMat}${art}${guide}</svg>`;
}
