import {PREP_CHECKS,scheduleLabel} from './event-workspace.mjs';
import {composePhotoStrip,safeHex} from './photo-strip.mjs';

export const STUDIO_STEPS=Object.freeze(['Details','Design','Event check','Backups']);
export const PALETTES=Object.freeze([
  {name:'Evergreen',primary:'#24352f',accent:'#d8c49b'},
  {name:'Black tie',primary:'#24242a',accent:'#d5bd91'},
  {name:'Rose garden',primary:'#754958',accent:'#edc9bf'},
  {name:'Coastal blue',primary:'#284d66',accent:'#cadde4'}
].map(Object.freeze));
export function previewConfiguration(draft){
  const raw=draft.schedule?.date||'',date=new Date(raw+'T12:00:00Z');
  const valid=/^\d{4}-\d{2}-\d{2}$/.test(raw)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===raw;
  return {...draft,date:valid?date.toLocaleDateString('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}):'Date to confirm',details:{...draft.details,eventName:draft.title}};
}
export function updateStudioDraft(draft,key,value){
  return {...draft,[key]:value,preparation:{...(key==='preparation'?value:draft.preparation),...(key==='details'?{colorsConfirmed:false}:{}),checks:{}}};
}
export function remainingChecks(draft){
  return (draft.preparation?.colorsConfirmed===true?0:1)+Object.keys(PREP_CHECKS).filter(k=>draft.preparation?.checks?.[k]!==true).length;
}
export function validatePreviewFile(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo. HEIC and other formats need to be converted first.');
  if(!file.size||file.size>10*1024*1024)throw new Error('Choose a photo smaller than 10 MB.');
}
// Decode locally. No network, storage writes, archive access, or print requests.
export async function readPreviewPhoto(file){
  validatePreviewFile(file);
  const url=URL.createObjectURL(file),image=new Image();let timer;
  try{
    await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('That photo took too long to open. Try a smaller JPG.')),10000);image.onload=resolve;image.onerror=()=>reject(new Error('This photo could not be opened. Re-export it as JPG or PNG.'));image.src=url;});
    const {naturalWidth:w,naturalHeight:h}=image;
    if(!w||!h||w*h>32000000)throw new Error('Choose a photo under 32 megapixels.');
    const scale=Math.min(1,1200/Math.max(w,h)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo preview is unavailable on this browser.');
    try{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.9);}finally{canvas.width=0;canvas.height=0;}
  }finally{clearTimeout(timer);image.onload=null;image.onerror=null;image.src='';URL.revokeObjectURL(url);}
}
export async function studioPosePreview(shots,primary,accent,photo=''){
  const count=Number(shots)===3?3:4,cfg={details:{primaryColor:safeHex(primary),secondaryColor:safeHex(accent,'#d8c49b')}};
  if(photo)return composePhotoStrip(Array(count).fill(photo),cfg);
  const samples=Array.from({length:count},(_,i)=>{
    const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo preview is unavailable on this browser.');
    const gradient=ctx.createLinearGradient(0,0,600,600);gradient.addColorStop(0,i%2? '#788879':cfg.details.primaryColor);gradient.addColorStop(1,i%2?'#455c52':'#172c27');ctx.fillStyle=gradient;ctx.fillRect(0,0,600,600);
    ctx.strokeStyle=cfg.details.secondaryColor;ctx.lineWidth=2;ctx.beginPath();ctx.arc(520,80,260,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(40,580,240,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff9ed';ctx.textAlign='center';ctx.font='italic 120px Georgia,serif';ctx.fillText(String(i+1).padStart(2,'0'),300,325);ctx.font='20px sans-serif';ctx.fillText('YOUR PHOTO HERE',300,405);
    const data=canvas.toDataURL('image/jpeg',.9);canvas.width=0;canvas.height=0;return data;
  });
  return composePhotoStrip(samples,cfg);
}

export function studioScheduleLabel(draft){const s=draft.schedule,time=/^([01]\d|2[0-3]):[0-5]\d$/;return s&&time.test(s.start)&&time.test(s.end)?scheduleLabel(draft):'Time to confirm · New York time';}
