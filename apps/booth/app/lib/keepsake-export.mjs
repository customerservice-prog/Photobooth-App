import {renderKeepsake} from './keepsake-designs.mjs';
export const EXPORT_WIDTH=1200,EXPORT_HEIGHT=1800,MAX_EXPORT_BYTES=2*1024*1024;
export const exportKey=input=>JSON.stringify([input.photo,input.cfg,input.monogram,input.template,input.filter]);
export function filename(title){return (String(title||'event').normalize('NFKD').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,70)||'event')+'-keepsake.jpg';}
export function latestOnly(){let version=0;return {invalidate(){version++;},async run(job,accept,reject){const token=++version;try{const result=await job();if(token===version)accept(result);}catch(error){if(token===version)reject(error);}}};}
function readImage(src){return new Promise((resolve,reject)=>{const image=new Image();const timer=setTimeout(()=>{image.src='';reject(new Error('Photo preparation timed out. Please try again.'));},15000);const done=()=>{clearTimeout(timer);image.onload=null;image.onerror=null;};image.onload=()=>{done();resolve(image);};image.onerror=()=>{done();reject(new Error('The keepsake could not be prepared on this device.'));};image.src=src;});}
function encode(canvas,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The keepsake image could not be encoded.')),'image/jpeg',quality));}
function dataUrl(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('The keepsake file could not be read.'));r.readAsDataURL(blob);});}
export async function makeKeepsakeExport(input){
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.photo||''))throw new Error('Wait for a captured photo before saving.');
 const key=exportKey(input),svg=renderKeepsake({...input,id:'export-card'});
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
 const canvas=document.createElement('canvas');canvas.width=EXPORT_WIDTH;canvas.height=EXPORT_HEIGHT;
 try{
  const image=await readImage(url),ctx=canvas.getContext('2d');if(!ctx)throw new Error('This device cannot create the keepsake file.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  let blob;for(const quality of [.94,.88,.82,.76,.70]){blob=await encode(canvas,quality);if(blob.size<=MAX_EXPORT_BYTES)break;}
  if(blob.size>MAX_EXPORT_BYTES)throw new Error('This keepsake is too large to send. Please print it or use a simpler design.');
  const file=new File([blob],filename(input.cfg?.title),{type:'image/jpeg'});
  return {key,file,blob,dataUrl:await dataUrl(blob),width:EXPORT_WIDTH,height:EXPORT_HEIGHT};
 }finally{URL.revokeObjectURL(url);canvas.width=0;canvas.height=0;}
}
// Called directly from a tap with a pre-built File; do not await rendering before navigator.share.
export function sharePrepared(artifact,title,nav=navigator){
 if(!artifact?.file)throw new Error('Your keepsake is still being prepared.');
 if(typeof nav.share!=='function'||!nav.canShare?.({files:[artifact.file]}))throw new Error('Device sharing is unavailable here. Tap Download Keepsake instead.');
 return nav.share({files:[artifact.file],title:String(title||'Your keepsake')});
}
export function downloadPrepared(artifact){
 if(!artifact?.dataUrl)throw new Error('Your keepsake is still being prepared.');
 const a=document.createElement('a');a.href=artifact.dataUrl;a.download=artifact.file.name;document.body.appendChild(a);a.click();a.remove();
}
