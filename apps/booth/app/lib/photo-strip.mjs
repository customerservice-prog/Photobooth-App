export function safeHex(value,fallback='#24352f'){
  const v=String(value||'').trim();
  return /^#[0-9a-f]{6}$/i.test(v)?v:fallback;
}

const PHOTO_DATA=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
export function validateShotSet(shots,expected){
  if(!Array.isArray(shots)||![3,4].includes(shots.length))throw new Error('A complete set of three or four photos is required. Please retake the session.');
  if(expected!==undefined&&(![3,4].includes(Number(expected))||shots.length!==Number(expected)))throw new Error('Not all of the configured photos were received. Please retake the session.');
  const entries=Array.from(shots);
  if(entries.some(src=>typeof src!=='string'||!PHOTO_DATA.test(src)))throw new Error('A captured photo is missing or invalid. Please retake the session.');
  return entries;
}

// Always keep the full original pose. Cropping here is irreversible: the later
// keepsake "Show the whole photo" control cannot recover pixels already removed.
export function fitPose(width,height,cell){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('A captured photo has invalid dimensions.');
  const {x,y,w,h}=cell,scale=Math.min(w/width,h/height);
  return {x:x+(w-width*scale)/2,y:y+(h-height*scale)/2,w:width*scale,h:height*scale};
}
export function photoStripCells(total){
  if(![3,4].includes(total))throw new Error('Choose a three- or four-photo layout.');
  const inner=36,gap=18,full=1200-inner*2,side=(full-gap)/2;
  if(total===3)return [{x:inner,y:inner,w:full,h:side},{x:inner,y:inner+side+gap,w:side,h:side},{x:inner+side+gap,y:inner+side+gap,w:side,h:side}];
  return Array.from({length:4},(_,i)=>({x:inner+(i%2)*(side+gap),y:inner+Math.floor(i/2)*(side+gap),w:side,h:side}));
}
function loadImage(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    let done=false;
    const finish=error=>{if(done)return;done=true;clearTimeout(timer);image.onload=null;image.onerror=null;error?reject(error):resolve(image);};
    const timer=setTimeout(()=>finish(new Error('A photo took too long to prepare. Please try the session again.')),8000);
    image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0?null:new Error('A captured photo has invalid dimensions.'));
    image.onerror=()=>finish(new Error('A captured photo could not be prepared.'));
    image.src=src;
  });
}

// Compose only the photo area. The normal keepsake renderer adds names, date
// and artwork once. No discarded shots, duplicate filler poses or square crops.
export async function composePhotoStrip(shots,cfg={}){
  const valid=validateShotSet(shots,cfg?.printPackage?.shotsPerSession);
  const images=await Promise.all(valid.map(loadImage));
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=1200;
  try{
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('This device cannot build the photo keepsake.');
    const primary=safeHex(cfg?.details?.primaryColor,'#24352f'),secondary=safeHex(cfg?.details?.secondaryColor,'#d8c49b');
    ctx.fillStyle=primary;ctx.fillRect(0,0,1200,1200);
    photoStripCells(images.length).forEach((cell,i)=>{
      const image=images[i],width=image.naturalWidth,height=image.naturalHeight,dest=fitPose(width,height,cell);
      ctx.fillStyle=secondary;ctx.fillRect(cell.x-6,cell.y-6,cell.w+12,cell.h+12);
      ctx.fillStyle=primary;ctx.fillRect(cell.x,cell.y,cell.w,cell.h);
      ctx.drawImage(image,0,0,width,height,dest.x,dest.y,dest.w,dest.h);
    });
    const result=canvas.toDataURL('image/jpeg',.94);
    if(!result.startsWith('data:image/jpeg;base64,'))throw new Error('The finished photo could not be prepared. Please try again.');
    return result;
  }finally{canvas.width=0;canvas.height=0;}
}
