// LaMarr graduation keepsakes. The photographs always come from the actual booth camera.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export const isLamarrGraduation=cfg=>/lamarr/i.test(String(cfg?.details?.graduate||'')+' '+String(cfg?.title||''));
function ornaments(){
 const dots=Array.from({length:92},(_,i)=>{const x=(i*619+43)%1200,y=(i*397+61)%1800;return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3+2)+'" fill="'+(i%2?'#ff8a18':'#e5b45f')+'" opacity=".85"/>';}).join('');
 const stars=Array.from({length:20},(_,i)=>{const x=i%2?1136:64,y=90+i*81;return '<path d="M0 -12L4 -4 13 -2 5 4 7 13 0 8 -8 13 -5 3 -12 -2 -4 -5Z" transform="translate('+x+' '+y+')" fill="'+(i%2?'#ff8b1a':'#e9b55b')+'"/>';}).join('');
 return dots+stars;
}
function base(){
 return '<defs><linearGradient id="lamarr-navy" x2="1" y2="1"><stop stop-color="#041329"/><stop offset=".5" stop-color="#0b2d59"/><stop offset="1" stop-color="#030c1f"/></linearGradient><linearGradient id="lamarr-orange" x2="0" y2="1"><stop stop-color="#ffb148"/><stop offset=".5" stop-color="#fa7117"/><stop offset="1" stop-color="#cf4912"/></linearGradient><linearGradient id="lamarr-gold"><stop stop-color="#f8d68d"/><stop offset=".5" stop-color="#fff3bf"/><stop offset="1" stop-color="#c78d37"/></linearGradient></defs><rect width="1200" height="1800" fill="url(#lamarr-navy)"/>'+ornaments()+'<rect x="14" y="14" width="1172" height="1772" rx="8" fill="none" stroke="#e2a34a" stroke-width="5"/>';
}
function photo(src,i,x,y,w,h,fit){
 return '<rect x="'+(x-8)+'" y="'+(y-8)+'" width="'+(w+16)+'" height="'+(h+16)+'" fill="#fcb155"/><rect x="'+(x-3)+'" y="'+(y-3)+'" width="'+(w+6)+'" height="'+(h+6)+'" fill="#ffffff"/>'+ (src?'<image data-guest-photo="true" data-pose="'+(i+1)+'" href="'+esc(src)+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="'+(fit==='fit'?'xMidYMid meet':'xMidYMid slice')+'"/>':'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#ced9e0"/><text x="'+(x+w/2)+'" y="'+(y+h/2)+'" text-anchor="middle" fill="#102a4d" font-size="36">PHOTO '+(i+1)+'</text>');
}
function heading(){
 return '<text x="600" y="105" text-anchor="middle" font-family="Georgia,serif" font-size="84" font-weight="bold" fill="url(#lamarr-gold)" stroke="#c35e1a" stroke-width="1">LaMarr</text><path d="M250 133H950" stroke="#ff881d" stroke-width="10"/>';
}
function footer(y=1690){
 return '<path d="M148 '+(y-90)+'H1052" stroke="#ff881d" stroke-width="7"/><text x="600" y="'+y+'" text-anchor="middle" font-family="Georgia,serif" font-size="64" font-weight="bold" fill="#fff0bf">October 10th, 2026</text><text x="600" y="'+(y+56)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="29" font-weight="bold" letter-spacing="8" fill="#ff9c2b">CONGRATS GRAD!</text>';
}
function svg(content,format){
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" data-layout="'+format+'" data-design="lamarr-graduation" role="img" aria-label="LaMarr graduation photo booth keepsake">'+base()+content+'</svg>';
}
export function renderLamarrFour(poses=[],cfg={}){
 const images=Array.isArray(poses)?poses:[];
 const cells=Array.from({length:4},(_,i)=>photo(images[i],i,100,174+i*343,1000,323,cfg.photoFit)).join('');
 return svg(heading()+cells+footer(1695),'photo_strip');
}
export function renderLamarrOne(photoSrc,cfg={}){
 return svg(heading()+photo(photoSrc,0,82,175,1036,1280,cfg.photoFit)+footer(1652),'card');
}
