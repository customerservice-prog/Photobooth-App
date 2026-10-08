import {validateShotSet} from './photo-strip.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

// Only the photo region changes between the approved one- and four-photo
// keepsakes. Artwork, printed text and frame geometry stay with the template.
export function approvedGridCells({x,y,w,h,radius=0}){
 if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)throw new Error('The approved photo frame is invalid.');
 // Keep all four rectangles inside a rounded frame, including its corners.
 const inset=Math.max(4,Math.max(0,radius)*(1-1/Math.sqrt(2))+1),gap=12;
 const width=(w-2*inset-gap)/2,height=(h-2*inset-gap)/2;
 if(width<=0||height<=0)throw new Error('The approved photo frame is too small.');
 return Array.from({length:4},(_,i)=>({x:x+inset+(i%2)*(width+gap),y:y+inset+Math.floor(i/2)*(height+gap),w:width,h:height}));
}
export function renderApprovedPhotoGrid({poses,sample=false,cfg={},box,id='card'}){
 const originals=sample&&(!poses||poses.length===0)?null:validateShotSet(poses,4);
 const cells=approvedGridCells(box),safeId=String(id).replace(/[^A-Za-z0-9_-]/g,'')||'card';
 const fit=cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 const backdrop=/^#[\da-f]{6}$/i.test(cfg.details?.primaryColor||'')?cfg.details.primaryColor:'#24352f';
 const clips=cells.map((cell,i)=>`<clipPath id="${safeId}-approved-pose-${i+1}">${rect(cell.x,cell.y,cell.w,cell.h,'white')}</clipPath>`).join('');
 const panels=cells.map((cell,i)=>rect(cell.x,cell.y,cell.w,cell.h,'#e5e6df')+(originals
  ?`<g clip-path="url(#${safeId}-approved-pose-${i+1})"><image data-guest-photo="true" data-pose="${i+1}" href="${esc(originals[i])}" x="${cell.x}" y="${cell.y}" width="${cell.w}" height="${cell.h}" preserveAspectRatio="${fit}"/></g>`
  :`<text x="${cell.x+cell.w/2}" y="${cell.y+cell.h/2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="32" fill="#53695d">PHOTO ${i+1}</text>`)).join('');
 return `<g data-approved-photo-region="true" data-pose-count="4"><defs>${clips}</defs>${rect(box.x,box.y,box.w,box.h,backdrop)}${panels}</g>`;
}
