import {getDesign} from './template-registry.mjs';
import {validateCustomDesign} from './custom-design.mjs';

// Screen styling only. The approved JPEG, print, archive and delivery inputs
// never depend on this palette or on the asynchronous artwork sampling.
const HEX=/^#[0-9a-f]{6}$/i;
const LIGHT='#fffaf1',DARK='#151b24',GOLD='#d4ad73';
const UPLOAD_PAPER='#111827',SAMPLE_WIDTH=64,SAMPLE_HEIGHT=96;
const validColor=(value,fallback)=>HEX.test(value||'')?value.toLowerCase():fallback;
const rgb=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
const hex=channels=>'#'+channels.map(channel=>Math.max(0,Math.min(255,Math.round(channel))).toString(16).padStart(2,'0')).join('');
const mix=(a,b,amount)=>hex(rgb(a).map((channel,index)=>channel*(1-amount)+rgb(b)[index]*amount));
function luminance(color){
 return rgb(color).map(channel=>{const value=channel/255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;})
  .reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index],0);
}
export function themeContrast(a,b){const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}
function readable(background,preferred){
 if(preferred&&themeContrast(background,preferred)>=4.5)return preferred;
 const tinted=themeContrast(background,LIGHT)>=themeContrast(background,DARK)?LIGHT:DARK;
 if(themeContrast(background,tinted)>=4.5)return tinted;
 return themeContrast(background,'#ffffff')>=themeContrast(background,'#000000')?'#ffffff':'#000000';
}
function createTheme(palette,source,label){
 const paper=validColor(palette.paper,UPLOAD_PAPER),accent=validColor(palette.accent,GOLD);
 const ink=readable(paper,validColor(palette.ink,DARK));
 // Move surfaces away from the readable ink, preserving its contrast.
 const awayFromInk=luminance(ink)>.45?'#000000':'#ffffff';
 const surface=mix(paper,awayFromInk,.04),panel=mix(paper,awayFromInk,.07);
 const header=luminance(paper)>.45?mix(ink,'#000000',.12):mix(paper,'#000000',.16);
 const muted=readable(paper,mix(ink,paper,.24));
 return {source,label,palette:{paper,ink,accent},style:{
  '--ag-paper':paper,'--ag-ink':ink,'--ag-accent':accent,'--ag-accent-ink':readable(accent),
  '--ag-surface':surface,'--ag-panel':panel,'--ag-muted':muted,
  '--ag-line':mix(accent,paper,.52),'--ag-header':header,'--ag-header-ink':readable(header)
 }};
}

export function guestFinishTheme(cfg={}){
 if(cfg.defaultTemplate==='custom'){
  const spec=validateCustomDesign(cfg.customDesign);
  if(spec.mode==='build')return createTheme({paper:spec.background,ink:spec.ink,accent:spec.accent},'custom-build','Custom design');
  return createTheme({paper:UPLOAD_PAPER,ink:LIGHT,accent:GOLD},'custom-upload','Custom artwork');
 }
 const design=getDesign(cfg.type,cfg.defaultTemplate);
 return createTheme(design,'builtin',design.name);
}

// Exported to verify the actual edge-color behavior without a browser or a
// customer photo. Only a bounded raster of the owner's artwork is considered.
export function artworkPaletteFromPixels({data,width,height,rects=[],background=LIGHT}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>SAMPLE_WIDTH||height>SAMPLE_HEIGHT||data?.length!==width*height*4)
  throw new Error('Artwork palette sampling requires a bounded RGBA image.');
 const base=rgb(validColor(background,LIGHT)),bins=new Map();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const px=(x+.5)/width*100,py=(y+.5)/height*100;
  if(px>12&&px<88&&py>12&&py<88)continue;
  // Expand exclusions by one sampled pixel: anti-aliasing at a photo opening
  // must not turn an old sample face into a screen color.
  if(rects.some(rect=>px>=rect.x-100/width&&px<=rect.x+rect.w+100/width&&py>=rect.y-100/height&&py<=rect.y+rect.h+100/height))continue;
  const index=(y*width+x)*4,alpha=data[index+3]/255;
  const channels=base.map((channel,i)=>data[index+i]*alpha+channel*(1-alpha));
  const key=channels.map(channel=>Math.floor(channel/24)).join(',');
  const bin=bins.get(key)||{count:0,channels:[0,0,0]};
  bin.count++;channels.forEach((channel,i)=>bin.channels[i]+=channel);bins.set(key,bin);
 }
 const colors=[...bins.values()].map(bin=>({count:bin.count,color:hex(bin.channels.map(channel=>channel/bin.count))})).sort((a,b)=>b.count-a.count);
 const paper=colors[0]?.color||validColor(background,LIGHT),paperRgb=rgb(paper),paperLight=luminance(paper);
 const accents=colors.filter(item=>{
  const channels=rgb(item.color),max=Math.max(...channels),min=Math.min(...channels);
  return max-min>32&&Math.abs(luminance(item.color)-paperLight)>.10&&
   Math.hypot(...channels.map((channel,index)=>channel-paperRgb[index]))>65;
 });
 const accent=accents[0]?.color||GOLD;
 return {paper,ink:readable(paper),accent};
}

function readArtwork(src){
 return new Promise((resolve,reject)=>{
  const image=new Image(),timer=setTimeout(()=>{cleanup();image.src='';reject(new Error('Artwork palette preparation timed out.'));},3000);
  const cleanup=()=>{clearTimeout(timer);image.onload=null;image.onerror=null;};
  image.onload=()=>{cleanup();resolve(image);};
  image.onerror=()=>{cleanup();reject(new Error('Artwork palette preparation failed.'));};
  image.src=src;
 });
}
export async function themeFromArtwork(raw,layout='card'){
 const spec=validateCustomDesign(raw);
 if(spec.mode==='build')return createTheme({paper:spec.background,ink:spec.ink,accent:spec.accent},'custom-build','Custom design');
 const kind=layout==='card'||layout==='one'?'one':layout==='photo_strip'||layout==='four'?'four':null;
 if(!kind)throw new Error('Choose the one-photo or four-photo artwork palette.');
 const fallback=createTheme({paper:UPLOAD_PAPER,ink:LIGHT,accent:GOLD},'custom-upload','Custom artwork');
 if(typeof document==='undefined'||typeof Image==='undefined')return fallback;
 let image,canvas;
 try{
  // validateCustomDesign allows only bounded local PNG/JPEG data URLs, so
  // this read cannot fetch a remote image or inherit another event's artwork.
  image=await readArtwork(spec.layouts[kind].image);
  if(!image.naturalWidth||!image.naturalHeight)return fallback;
  canvas=document.createElement('canvas');canvas.width=SAMPLE_WIDTH;canvas.height=SAMPLE_HEIGHT;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return fallback;
  context.fillStyle=spec.background;context.fillRect(0,0,SAMPLE_WIDTH,SAMPLE_HEIGHT);
  const scale=Math.min(SAMPLE_WIDTH/image.naturalWidth,SAMPLE_HEIGHT/image.naturalHeight);
  const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
  context.drawImage(image,(SAMPLE_WIDTH-width)/2,(SAMPLE_HEIGHT-height)/2,width,height);
  const pixels=context.getImageData(0,0,SAMPLE_WIDTH,SAMPLE_HEIGHT);
  const palette=artworkPaletteFromPixels({data:pixels.data,width:SAMPLE_WIDTH,height:SAMPLE_HEIGHT,rects:spec.layouts[kind].rects,background:spec.background});
  return createTheme(palette,'custom-upload','Custom artwork');
 }catch{return fallback;}
 finally{if(image)image.src='';if(canvas){canvas.width=0;canvas.height=0;}}
}
