// Print-ready navy, orange and gold graduation layouts. No sample or visitor
// faces are bundled: the actual captured JPEGs are inserted into these SVGs.
// The SAME SVG is used by preview, export and the physical 4x6 print.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const bound=(v,n=65)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,n);
const imageAllowed=v=>typeof v==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
export const isLamarrGraduation=cfg=>/lamar{1,2}/i.test(String(cfg?.details?.graduate||'')+' '+String(cfg?.title||''));
export const isGraduationGala=cfg=>cfg?.type==='graduation'&&cfg?.defaultTemplate==='grad-gala';
const rect=(x,y,w,h,fill,other='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${other}/>`;
const path=(d,fill='none',stroke='none',sw=1)=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
function labels(cfg={}){
 const name=bound(cfg.details?.graduate||cfg.details?.honoree||cfg.title||'The Graduate',30)||'The Graduate';
 const year=/^\d{4}$/.test(cfg.details?.classYear||'')?cfg.details.classYear:(bound(cfg.date).match(/\b20\d{2}\b/)||['2026'])[0];
 const raw=bound(cfg.date||'October 10, 2026',45);
 const date=raw.replace(/\b(\d{1,2})(?!ST|ND|RD|TH)\b(?=\s*,?\s*20\d{2})/i,(whole,num)=>{
  const n=Number(num),suffix=n%100>=11&&n%100<=13?'TH':n%10===1?'ST':n%10===2?'ND':n%10===3?'RD':'TH';
  return num+suffix;
 }).replace(',','').toUpperCase();
 return {name,year,date};
}
function defs(){return `<defs>
 <linearGradient id="lmBg" x1="0" y1="0" x2=".87" y2="1"><stop stop-color="#020c20"/><stop offset=".42" stop-color="#061f46"/><stop offset=".75" stop-color="#05152e"/><stop offset="1" stop-color="#010915"/></linearGradient>
 <radialGradient id="lmBlueGlow" cx=".6" cy=".34" r=".75"><stop stop-color="#154785" stop-opacity=".54"/><stop offset="1" stop-color="#010b1e" stop-opacity="0"/></radialGradient>
 <linearGradient id="lmGold" x1="0" y1="0" x2="1" y2=".37"><stop stop-color="#a95c18"/><stop offset=".10" stop-color="#ffcc5e"/><stop offset=".27" stop-color="#fff4c1"/><stop offset=".43" stop-color="#e79e37"/><stop offset=".68" stop-color="#ffdfa0"/><stop offset=".9" stop-color="#c5791b"/><stop offset="1" stop-color="#fff1a7"/></linearGradient>
 <linearGradient id="lmGoldFrame" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8bd"/><stop offset=".28" stop-color="#c37b23"/><stop offset=".55" stop-color="#ffda75"/><stop offset=".82" stop-color="#a75b1b"/><stop offset="1" stop-color="#ffe79b"/></linearGradient>
 <radialGradient id="lmOrange" cx=".33" cy=".18" r=".86"><stop stop-color="#fff0b6"/><stop offset=".16" stop-color="#ffc16a"/><stop offset=".52" stop-color="#fe891c"/><stop offset="1" stop-color="#a5410c"/></radialGradient>
 <radialGradient id="lmNavy" cx=".32" cy=".21" r=".95"><stop stop-color="#7b9ed2"/><stop offset=".22" stop-color="#345a99"/><stop offset=".65" stop-color="#081936"/><stop offset="1" stop-color="#020710"/></radialGradient>
 <pattern id="lmGlitter" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="url(#lmGoldFrame)"/><circle cx="5" cy="3" r="2" fill="#fff4cd" opacity=".95"/><circle cx="16" cy="12" r="2.2" fill="#fff5e0"/><circle cx="11" cy="20" r="1.5" fill="#9b5011" opacity=".7"/><path d="M4 16l4 -5 3 3 -4 5Z" fill="#c98416"/></pattern>
 </defs>`;}
function glint(x,y,r,fill='url(#lmGold)'){return `<path d="M0 -${r} Q${r*.11} -${r*.11} ${r} 0 Q${r*.11} ${r*.11} 0 ${r} Q-${r*.11} ${r*.11} -${r} 0 Q-${r*.11} -${r*.11} 0 -${r}Z" transform="translate(${x} ${y})" fill="${fill}"/>`;}
function confetti(){let a='';let seed=6312;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<190;i++){
 const r=rand(),x=i%3===0?rand()*180:i%3===1?1020+rand()*180:rand()*1200;
 const y=rand()*1800,size=3+rand()*12,color=i%4===0?'#ff9d32':i%5===0?'#e6c26b':'url(#lmGold)';
 a+=i%4===0?glint(x.toFixed(1),y.toFixed(1),size.toFixed(1),color):`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(size*.45).toFixed(1)}" height="${(size*1.3).toFixed(1)}" transform="rotate(${Math.round(rand()*180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${color}" opacity=".9"/>`;
 }return a;}
function balloon(x,y,scale,navy=false,angle=0){
 return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})"><path d="M0 105Q42 167 0 237Q-40 304 0 364" fill="none" stroke="#dba950" stroke-width="3"/><ellipse ry="112" rx="85" fill="${navy?'url(#lmNavy)':'url(#lmOrange)'}" stroke="${navy?'#0a2449':'#ffcb72'}" stroke-width="3"/><path d="M-9 110L0 127 9 110Z" fill="#d48b25"/><ellipse cx="-31" cy="-43" rx="17" ry="42" transform="rotate(24 -31 -43)" fill="#ffffff" opacity=".35"/></g>`;
}
function balloons(){return balloon(67,153,.9,true,-16)+balloon(246,152,.93,false,12)+balloon(1153,1662,.9,true,17)+balloon(995,1751,.85,false,-14);}
function cap(x,y,scale){return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M-110 -4L0 -50 110 -4 0 40Z" fill="#031126" stroke="url(#lmGold)" stroke-width="7"/><path d="M-74 20V60Q0 103 74 60V20" fill="#051d41" stroke="url(#lmGold)" stroke-width="6"/><path d="M108 1V80" stroke="url(#lmGold)" stroke-width="6"/><path d="M102 83l-14 44h40l-14 -44Z" fill="url(#lmGold)"/></g>`;}
function text(v,x,y,size,fill,options=''){return `<text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" font-size="${size}" ${options}>${esc(v)}</text>`;}
function name(v,y){
 const sz=v.length>22?88:v.length>14?110:155;
 return `<g data-text-role="name">${text(v,600,y,sz,'url(#lmGold)','font-family="Georgia, serif" font-style="italic" font-weight="bold" paint-order="stroke" stroke="#703108" stroke-width="2"'+(v.length>14?' textLength="990" lengthAdjust="spacingAndGlyphs"':''))}</g>`+
 path(`M196 ${y+27}Q600 ${y+51} 1004 ${y+27}`,'none','#fa8723',10);
}
function photo(src,i,x,y,w,h,fit='fill'){
 const safe=imageAllowed(src)?src:null;
 const frame=rect(x-16,y-16,w+32,h+32,'url(#lmGlitter)')+rect(x-5,y-5,w+10,h+10,'#fb9b30');
 const inside=safe?`<image data-guest-photo="true" data-pose="${i+1}" href="${esc(safe)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit==='fit'?'xMidYMid meet':'xMidYMid slice'}"/>`:rect(x,y,w,h,'#2a3f57')+
 `<g fill="#d5dbe1" opacity=".8"><circle cx="${x+w/2}" cy="${y+h*.38}" r="${Math.min(h*.13,w*.09)}"/><path d="M${x+w*.33} ${y+h*.84}Q${x+w*.5} ${y+h*.52} ${x+w*.67} ${y+h*.84}Z"/></g>`+
 text('PHOTO '+(i+1),x+w/2,y+h*.92,25,'#fff2c2','font-family="Arial,sans-serif" letter-spacing="3"');
 return frame+inside;
}
function base(){return defs()+rect(0,0,1200,1800,'url(#lmBg)')+rect(0,0,1200,1800,'url(#lmBlueGlow)')+confetti()+
 rect(15,15,1170,1770,'none','stroke="url(#lmGold)" stroke-width="5"')+
 rect(25,25,1150,1750,'none','stroke="#fc8c23" stroke-width="2"');}
function svg(body,layout,cfg){const t=labels(cfg);return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" role="img" data-design="lamarr-graduation" data-template-key="graduation/grad-gala" data-layout="${layout}" aria-label="${esc(t.name+' graduation print')}"><title>${esc(t.name+' graduation keepsake')}</title>${base()}${body}</svg>`;}
export function renderLamarrOne(photoSrc,cfg={}){
 const t=labels(cfg),image=photo(photoSrc,0,67,240,1066,1012,cfg.photoFit);
 const hero=balloons()+text('Congrats Grad!',774,147,104,'url(#lmGold)','font-family="Georgia, serif" font-style="italic" font-weight="bold" paint-order="stroke" stroke="#783709" stroke-width="2"');
 const lower=cap(600,1301,.70)+name(t.name,1504)+text('Grad Party!',600,1606,93,'#fff7e9','font-family="Georgia, serif" font-style="italic"')+
 text(t.date,600,1718,49,'#fff0d1','font-family="Georgia, serif" font-weight="bold" letter-spacing="3"');
 return svg(hero+image+lower,'card',cfg);
}
export function renderLamarrFour(poses=[],cfg={}){
 const t=labels(cfg),shots=Array.isArray(poses)?poses:[],
 cells=Array.from({length:4},(_,i)=>photo(shots[i],i,87,222+i*309,1026,284,cfg.photoFit)).join('');
 const head=cap(163,112,.62)+text('Class of',786,98,70,'url(#lmGold)','font-family="Georgia, serif" font-style="italic"')+
 text(t.year,1034,165,100,'#fff7e9','font-family="Georgia, serif" font-weight="bold"');
 const foot=balloon(94,1545,.52,false,-15)+balloon(1100,1580,.52,true,17)+name(t.name,1588)+
 text(t.date,600,1687,51,'#ffd080','font-family="Georgia, serif" font-weight="bold" letter-spacing="2"')+
 glint(600,1734,17)+text('CONGRATS GRAD!',600,1771,25,'#fff8ef','font-family="Arial,sans-serif" font-weight="bold" letter-spacing="7"');
 return svg(head+cells+foot,'photo_strip',cfg);
}
