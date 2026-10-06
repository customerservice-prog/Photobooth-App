export function safeHex(value,fallback='#24352f'){
  const v=String(value||'').trim();
  return /^#[0-9a-f]{6}$/i.test(v)?v:fallback;
}

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('A captured photo could not be prepared.'));
    image.src=src;
  });
}

function drawCover(ctx,image,x,y,w,h){
  const sourceRatio=image.width/image.height,targetRatio=w/h;
  let sx=0,sy=0,sw=image.width,sh=image.height;
  if(sourceRatio>targetRatio){sw=image.height*targetRatio;sx=(image.width-sw)/2;}
  else{sh=image.width/targetRatio;sy=(image.height-sh)/2;}
  ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);
}

export async function composePhotoStrip(shots,cfg={}){
  const valid=(Array.isArray(shots)?shots:[]).filter(src=>/^data:image\/(jpeg|png|webp);base64,/i.test(src)).slice(0,4);
  if(valid.length<3)throw new Error('At least three photos are required for a photo strip.');
  const images=await Promise.all(valid.map(loadImage));
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=1800;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('This device cannot build the photo strip.');
  const primary=safeHex(cfg.details?.primaryColor,'#24352f');
  const secondary=safeHex(cfg.details?.secondaryColor,'#d8c49b');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,1200,1800);
  ctx.fillStyle=primary;ctx.fillRect(0,0,1200,64);ctx.fillRect(0,1736,1200,64);
  const margin=72,gap=28,top=108,bottom=1640;
  const cols=2,rows=2,cellW=(1200-margin*2-gap)/2,cellH=(bottom-top-gap)/2;
  for(let i=0;i<4;i++){
    const image=images[Math.min(i,images.length-1)];
    const col=i%cols,row=Math.floor(i/cols),x=margin+col*(cellW+gap),y=top+row*(cellH+gap);
    ctx.fillStyle=secondary;ctx.fillRect(x-8,y-8,cellW+16,cellH+16);
    drawCover(ctx,image,x,y,cellW,cellH);
  }
  ctx.fillStyle=primary;ctx.textAlign='center';
  ctx.font='600 42px system-ui, -apple-system, sans-serif';
  ctx.fillText(String(cfg.title||'Friendly Photo Booth').slice(0,48),600,1694);
  ctx.fillStyle=secondary;ctx.font='500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(String(cfg.date||'').slice(0,42),600,1768);
  return canvas.toDataURL('image/jpeg',.94);
}
