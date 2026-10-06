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

// Builds the multi-pose photo area only. Event names/date/artwork are added later
// by the normal keepsake renderer, so the print is not framed twice or cropped.
export async function composePhotoStrip(shots,cfg={}){
  const valid=(Array.isArray(shots)?shots:[]).filter(src=>/^data:image\/(jpeg|png|webp);base64,/i.test(src)).slice(0,4);
  if(valid.length<3)throw new Error('At least three photos are required for a photo strip.');
  const images=await Promise.all(valid.map(loadImage));
  const canvas=document.createElement('canvas');
  canvas.width=1200;canvas.height=1200;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('This device cannot build the photo strip.');
  const primary=safeHex(cfg.details?.primaryColor,'#24352f');
  const secondary=safeHex(cfg.details?.secondaryColor,'#d8c49b');
  ctx.fillStyle=primary;ctx.fillRect(0,0,1200,1200);

  const margin=26,gap=18,inner=margin+10;
  const drawCell=(image,x,y,w,h)=>{
    ctx.fillStyle=secondary;
    ctx.fillRect(x-6,y-6,w+12,h+12);
    drawCover(ctx,image,x,y,w,h);
  };

  if(images.length===3){
    const topH=550,bottomH=550,fullW=1200-inner*2,halfW=(fullW-gap)/2;
    drawCell(images[0],inner,inner,fullW,topH);
    drawCell(images[1],inner,inner+topH+gap,halfW,bottomH);
    drawCell(images[2],inner+halfW+gap,inner+topH+gap,halfW,bottomH);
  }else{
    const fullW=1200-inner*2,cell=(fullW-gap)/2;
    for(let i=0;i<4;i++){
      const col=i%2,row=Math.floor(i/2);
      drawCell(images[i],inner+col*(cell+gap),inner+row*(cell+gap),cell,cell);
    }
  }
  return canvas.toDataURL('image/jpeg',.94);
}
