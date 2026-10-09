import {eventCopy,fitText} from './keepsake-model.mjs';
import {validateShotSet} from './photo-strip.mjs';

export const CUSTOM_DESIGN_WIDTH=1200,CUSTOM_DESIGN_HEIGHT=1800;
export const CUSTOM_IMAGE_MAX_BYTES=300000,CUSTOM_DESIGN_MAX_BYTES=800000;
const HEX=/^#[0-9a-f]{6}$/i;
const PHOTO=/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const copyRect=rect=>({x:rect.x,y:rect.y,w:rect.w,h:rect.h});

// Both formats are one 4x6 sheet. Geometry is expressed in percentages of it.
export function createCustomDesign(mode='build'){
 if(!['build','upload'].includes(mode))throw new Error('Choose a custom design upload or builder.');
 return {v:1,mode,background:'#fffaf1',ink:'#263c37',accent:'#c5a46a',heading:'',footer:'',layouts:{
  one:{image:'',rects:[{x:8,y:14,w:84,h:60}]},
  four:{image:'',rects:[14,31,48,65].map(y=>({x:8,y,w:84,h:15}))}
 }};
}
function color(value,fallback){
 if(value===undefined)return fallback;
 if(typeof value!=='string'||!HEX.test(value))throw new Error('Use a six-digit color for the custom artwork.');
 return value.toLowerCase();
}
function text(value,max){
 if(value===undefined)return '';
 if(typeof value!=='string')throw new Error('Custom artwork text must be plain text.');
 return value.replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
}
function artwork(value){
 if(value===undefined||value==='')return '';
 if(typeof value!=='string'||value.length>Math.ceil(CUSTOM_IMAGE_MAX_BYTES/3)*4+32)
  throw new Error('Each artwork image must be a PNG or JPEG no larger than 300 KB after preparation.');
 const match=value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
 if(!match||match[2].length%4!==0)throw new Error('Upload a PNG or JPEG image; web links and SVG artwork are not supported.');
 let bytes;try{bytes=atob(match[2]);}catch{throw new Error('The custom artwork image could not be read.');}
 if(bytes.length>CUSTOM_IMAGE_MAX_BYTES)throw new Error('Each artwork image must be no larger than 300 KB after preparation.');
 const png=bytes.length>=24&&[137,80,78,71,13,10,26,10].every((byte,i)=>bytes.charCodeAt(i)===byte)&&bytes.slice(12,16)==='IHDR';
 const jpeg=bytes.length>=4&&bytes.charCodeAt(0)===255&&bytes.charCodeAt(1)===216&&bytes.charCodeAt(2)===255;
 if(match[1]==='png'?!png:!jpeg)throw new Error('The uploaded file is not a valid PNG or JPEG artwork image.');
 return value;
}
function rectangles(raw,count){
 if(!Array.isArray(raw)||raw.length!==count)throw new Error(`Set ${count} photo ${count===1?'window':'windows'} for this custom layout.`);
 const rects=raw.map(rect=>{
  if(!object(rect)||!['x','y','w','h'].every(key=>typeof rect[key]==='number'&&Number.isFinite(rect[key]))||
   rect.x<0||rect.y<0||rect.w<1||rect.h<1||rect.x+rect.w>100||rect.y+rect.h>100)
   throw new Error('Keep every photo window inside the sheet, using percentages from 0 to 100.');
  return copyRect(rect);
 });
 for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
  const a=rects[i],b=rects[j];
  if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y)
   throw new Error('Photo windows must not overlap. Move or resize the windows.');
 }
 return rects;
}
export function validateCustomDesign(raw,{allowIncompleteUpload=false}={}){
 if(!object(raw)||raw.v!==1||!['build','upload'].includes(raw.mode)||!object(raw.layouts))
  throw new Error('This custom design is missing or unsupported. Prepare both photo layouts before saving.');
 const defaults=createCustomDesign(raw.mode),layouts={};
 for(const [name,count] of [['one',1],['four',4]]){
  const layout=raw.layouts[name];
  if(!object(layout))throw new Error('Prepare both the 1-photo and 4-photo custom layouts.');
  const image=artwork(layout.image);
  if(raw.mode==='upload'&&!allowIncompleteUpload&&!image)throw new Error('Upload artwork for both the 1-photo and 4-photo layouts.');
  layouts[name]={image,rects:rectangles(layout.rects,count)};
 }
 const result={v:1,mode:raw.mode,background:color(raw.background,defaults.background),
  ink:color(raw.ink,defaults.ink),accent:color(raw.accent,defaults.accent),
  heading:text(raw.heading,80),footer:text(raw.footer,120),layouts};
 if(new TextEncoder().encode(JSON.stringify(result)).length>CUSTOM_DESIGN_MAX_BYTES)
  throw new Error('The combined custom artwork is too large. Prepare smaller PNG or JPEG images.');
 return result;
}
export function isValidCustomDesign(raw,options){try{validateCustomDesign(raw,options);return true;}catch{return false;}}

const rect=(x,y,w,h,fill,stroke='none',width=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
function label(value,y,size,fill,{lines=1,bold=false,italic=false}={}){
 const fitted=fitText(value,1050,size,lines);
 return fitted.lines.map((line,i)=>`<text data-copy="${esc(line)}" x="600" y="${y+i*fitted.size*1.12}" text-anchor="middle" font-family="${italic?'Georgia, serif':'Arial, sans-serif'}" font-size="${fitted.size}" font-weight="${bold?'700':'400'}" font-style="${italic?'italic':'normal'}" fill="${fill}"${line.length*fitted.size*.62>1050?' textLength="1050" lengthAdjust="spacingAndGlyphs"':''}>${esc(line)}</text>`).join('');
}
export function renderCustomDesign(input={}){
 const cfg=object(input.cfg)?input.cfg:{},sample=input.sample===true;
 const spec=validateCustomDesign(cfg.customDesign,{allowIncompleteUpload:sample});
 const four=input.layout==='photo_strip',layout=spec.layouts[four?'four':'one'];
 const id=String(input.id||'custom-design').replace(/[^A-Za-z0-9_-]/g,'')||'custom-design';
 const copy=eventCopy(cfg),fit=cfg.photoFit==='fit'?'xMidYMid meet':'xMidYMid slice';
 let photos;
 if(four)photos=sample&&(!input.poses||input.poses.length===0)?null:validateShotSet(input.poses,4);
 else{
  const src=input.photo||'';
  if(!src&&sample)photos=null;
  else if(typeof src==='string'&&PHOTO.test(src))photos=[src];
  else throw new Error('A captured photo is missing or invalid. Please retake the session.');
 }
 let art=rect(0,0,1200,1800,spec.background);
 if(spec.mode==='upload'&&layout.image)art+=`<image data-custom-artwork="true" href="${esc(layout.image)}" x="0" y="0" width="1200" height="1800" preserveAspectRatio="xMidYMid meet"/>`;
 if(spec.mode==='build')art+=rect(30,30,1140,1740,'none',spec.accent,3)+rect(44,44,1112,1712,'none',spec.accent,1);
 const clips=layout.rects.map((r,i)=>`<clipPath id="${id}-custom-pose-${i+1}">${rect(r.x*12,r.y*18,r.w*12,r.h*18,'white')}</clipPath>`).join('');
 art+=`<g data-custom-photo-region="true" data-pose-count="${layout.rects.length}"><defs>${clips}</defs>`;
 art+=layout.rects.map((r,i)=>{
  const x=r.x*12,y=r.y*18,w=r.w*12,h=r.h*18;
  // Opaque windows cover old sample faces even when the live photo is contained.
  const background=rect(x,y,w,h,'#e5e6df');
  const media=photos?`<g clip-path="url(#${id}-custom-pose-${i+1})"><image data-guest-photo="true" data-pose="${i+1}" href="${esc(photos[i])}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${fit}"/></g>`
   :`<text x="${x+w/2}" y="${y+h/2}" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="#62716b">YOUR PHOTO${four?' '+(i+1):''}</text>`;
  return background+media+(spec.mode==='build'?rect(x,y,w,h,'none',spec.accent,3):'');
 }).join('')+'</g>';
 if(spec.mode==='build'){
  art+=label(spec.heading||copy.eyebrow,160,42,spec.ink,{bold:true});
  art+=`<g data-text-role="name">${label(copy.title,1565,86,spec.ink,{lines:2,italic:true})}</g>`;
  art+=label(copy.date,1705,30,spec.ink)+label(spec.footer,1760,23,spec.ink);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" role="img" aria-label="${esc('Custom artwork — '+copy.title)}" data-design="${esc(copy.type)}-custom" data-template-key="${esc(copy.type)}/custom" data-layout="${four?'photo_strip':'card'}" data-custom-mode="${spec.mode}"><title>${esc(copy.title)}</title>${art}</svg>`;
}
