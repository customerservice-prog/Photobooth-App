// The same self-contained 4x6 SVG powers on-screen proofs, printing and JPEG delivery.
// Each column uses the original poses in order, not the already-composited card.
import {lettering} from './atelier-lettering.mjs';
import {eventCopy} from './keepsake-model.mjs';
import {safeHex,validateShotSet} from './photo-strip.mjs';
import {normalizePrintLayouts,getStripDesign} from './print-layouts.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,fill,stroke='none',sw=1)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function contrast(hex){const c=hex.slice(1).match(/../g).map(h=>{const n=parseInt(h,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722>.4?'#172d26':'#fffdf7';}
export function stripPhotoCells(total){
 if(![3,4].includes(total))throw new Error('A photo strip needs three or four original poses.');
 const top=230,bottom=1466,gap=18,h=(bottom-top-gap*(total-1))/total;
 return Array.from({length:total},(_,i)=>({x:42,y:top+i*(h+gap),w:516,h}));
}
export function renderClassicPhotoStrip({poses,cfg={},template='ivory',stripMode,sample=false}={}){
 const rules=normalizePrintLayouts(cfg.printLayouts),design=getStripDesign(template),copy=eventCopy(cfg);
 const total=[3,4].includes(Number(cfg.printPackage?.shotsPerSession))?Number(cfg.printPackage.shotsPerSession):4;
 const shots=sample&&(!poses||poses.length===0)?null:validateShotSet(poses,total);
 const mode=(stripMode||rules.stripMode)==='double'?'double':'single',columns=mode==='double'?[0,600]:[300];
 const primary=rules.useEventColors?safeHex(cfg.details?.primaryColor,'#24352f'):'#232824';
 const accent=rules.useEventColors?safeHex(cfg.details?.secondaryColor,'#d8c49b'):'#777777';
 const paper=design.id==='blush'?'#17241f':'#fffdf7',ink=design.id==='blush'?'#fffdf7':primary;
 const title=String(copy.title||cfg.title||'Our Celebration').slice(0,160);
 const person=cfg.type==='other'?String(cfg.details?.honoree||''):'';
 const caption=rules.footerText||(cfg.type==='other'?cfg.details?.subtitle:'')||copy.subtitle||'';
 const footer=[person,caption].filter(Boolean).join(' · '),headline=rules.stripHeadline||'A MOMENT TO KEEP';
 const text=(value,y,width,size,fill=ink,options={})=>lettering(value,300,y,width,size,fill,{face:'sans',...options});
 let column=rect(12,18,576,1764,paper)+rect(26,32,548,1736,'none',accent,1.3);
 if(design.id==='champagne')column+=rect(26,32,548,165,primary);
 column+=`<circle cx="70" cy="77" r="4" fill="${accent}"/><circle cx="530" cy="77" r="4" fill="${accent}"/>`;
 column+=text(headline,77,430,17,design.id==='champagne'?contrast(primary):ink,{tracking:2.4});
 column+=text(title,129,496,42,design.id==='champagne'?contrast(primary):ink,{face:'serif',lines:2,bounds:[100,190]});
 for(const [i,cell] of stripPhotoCells(total).entries()){
  column+=rect(cell.x-4,cell.y-4,cell.w+8,cell.h+8,accent)+rect(cell.x,cell.y,cell.w,cell.h,design.id==='blush'?'#243b32':'#e9e8df');
  column+=shots?`<image data-guest-photo="true" data-pose="${i+1}" href="${esc(shots[i])}" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" preserveAspectRatio="${cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice'}"/>`:
   text(String(i+1).padStart(2,'0'),cell.y+cell.h*.53,cell.w-30,70,'#476051',{face:'serif'})+text('YOUR POSE',cell.y+cell.h*.75,cell.w-30,17,'#476051',{tracking:3});
  column+=`<g aria-hidden="true"><rect x="${cell.x+8}" y="${cell.y+8}" width="38" height="26" rx="13" fill="${ink}" opacity=".84"/><text x="${cell.x+27}" y="${cell.y+26}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="${paper}">${String(i+1).padStart(2,'0')}</text></g>`;
 }
 column+=text(footer,1552,488,28,ink,{lines:2,bounds:[1510,1620]});
 column+=`<path d="M160 1653H440" stroke="${accent}" stroke-width="1.5"/>`;
 column+=text(copy.date||cfg.date||'',1694,486,24,ink)+text('FRIENDLY PHOTO BOOTH',1742,485,13,ink,{tracking:2});
 const art=columns.map((x,i)=>`<g data-strip-copy="${i+1}" transform="translate(${x} 0)">${column}</g>`).join('');
 const guide=mode==='double'&&rules.showCutGuide?'<path data-cut-guide="true" d="M600 42V1758" stroke="#b9b9ad" stroke-width="1" stroke-dasharray="5 10"/><g aria-hidden="true" fill="#85857c" font-family="Arial,sans-serif" font-size="10" letter-spacing="2"><text x="600" y="28" text-anchor="middle">CUT HERE</text><text x="600" y="1788" text-anchor="middle">CUT HERE</text></g>':'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800" role="img" aria-label="${esc(design.name+' photo strip — '+title)}" data-collection="photo-strips" data-layout="photo_strip" data-strip-mode="${mode}" data-pose-count="${total}" data-design="strip-${design.id}"><title>${esc(title+' — '+(mode==='double'?'two matching photo strips':'single photo strip'))}</title>${rect(0,0,1200,1800,'#ffffff')}${art}${guide}</svg>`;
}
