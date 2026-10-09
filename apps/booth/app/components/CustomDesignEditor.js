'use client';
import {useEffect,useRef,useState} from 'react';
import {validateCustomDesign} from '../lib/custom-design.mjs';

const MAX_FILE_BYTES=12*1024*1024,MAX_DATA_LENGTH=350000;
async function artworkFromFile(file){
 if(!['image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PNG or JPEG image.');
 if(file.size>MAX_FILE_BYTES)throw new Error('Choose artwork smaller than 12 MB.');
 const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The image could not be read. Please choose it again.'));reader.readAsDataURL(file);});
 const img=await new Promise((resolve,reject)=>{const picture=new Image();picture.onload=()=>resolve(picture);picture.onerror=()=>reject(new Error('This file could not be opened as an image.'));picture.src=source;});
 if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>12000||img.naturalHeight>12000||img.naturalWidth*img.naturalHeight>32000000)throw new Error('Choose artwork below 32 megapixels, with dimensions below 12,000 pixels.');
 let scale=Math.min(1,1200/img.naturalWidth,1800/img.naturalHeight);
 let opaque=file.type==='image/jpeg';
 for(let attempt=0;attempt<9;attempt++){
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Image preparation is unavailable on this device.');
  context.drawImage(img,0,0,canvas.width,canvas.height);
  if(file.type==='image/png'){
   const png=canvas.toDataURL('image/png');if(png.length<=MAX_DATA_LENGTH)return png;
   if(attempt===0){const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;opaque=true;for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255){opaque=false;break;}}
  }
  // Keep detailed opaque artwork at print resolution when JPEG compression fits.
  // Transparent frames retain PNG so their alpha channel is preserved.
  if(opaque)for(const quality of [.9,.84,.76,.65]){const jpeg=canvas.toDataURL('image/jpeg',quality);if(jpeg.length<=MAX_DATA_LENGTH)return jpeg;}
  scale*=.8;
 }
 throw new Error('This artwork is too detailed to save. Try a smaller PNG or JPEG.');
}
const number=value=>Math.max(0,Math.min(100,Number(value)||0));
export default function CustomDesignEditor({value,onChange}){
 const guard=useRef(null),pending=useRef({}),uploads=useRef({one:value.layouts.one.image,four:value.layouts.four.image}),[busy,setBusy]=useState({}),[error,setError]=useState('');
 let invalid='';try{validateCustomDesign(value);}catch(e){invalid=e.message||'Review both layouts before saving.';}
 const busyNow=Object.values(busy).some(Boolean),validation=busyNow?'Artwork is being prepared. Please wait.':invalid;
 useEffect(()=>{guard.current?.setCustomValidity(validation);},[validation]);
 function field(key,next){onChange({...value,[key]:next});}
 function chooseMode(mode){
  if(mode===value.mode)return;
  for(const kind of ['one','four'])pending.current[kind]=(pending.current[kind]||0)+1;
  setBusy({});setError('');
  if(mode==='build')uploads.current={one:value.layouts.one.image,four:value.layouts.four.image};
  onChange({...value,mode,layouts:Object.fromEntries(['one','four'].map(kind=>[kind,{...value.layouts[kind],image:mode==='upload'?uploads.current[kind]:''}]))});
 }
 function layout(kind,next){onChange({...value,layouts:{...value.layouts,[kind]:{...value.layouts[kind],...next}}});}
 function rect(kind,index,key,next){
  const rects=value.layouts[kind].rects.map((rect,i)=>i===index?{...rect,[key]:number(next)}:rect);
  const rect=rects[index];rect.x=Math.min(rect.x,100-rect.w);rect.y=Math.min(rect.y,100-rect.h);rect.w=Math.min(rect.w,100-rect.x);rect.h=Math.min(rect.h,100-rect.y);
  layout(kind,{rects});
 }
 async function upload(kind,input){
  const file=input.files?.[0];if(!file)return;
  const request=(pending.current[kind]||0)+1;pending.current[kind]=request;
  setBusy(current=>({...current,[kind]:true}));setError('');input.setCustomValidity('Artwork is being prepared. Please wait.');
  try{
   const image=await artworkFromFile(file);
   if(pending.current[kind]!==request)return;
   uploads.current[kind]=image;
   // Functional updates in the parent retain a second upload that finished first.
   onChange(current=>({...current,layouts:{...current.layouts,[kind]:{...current.layouts[kind],image}}}));
   input.setCustomValidity('');
  }catch(e){if(pending.current[kind]===request){setError(e.message);input.value='';input.setCustomValidity('');}}
  finally{if(pending.current[kind]===request)setBusy(current=>({...current,[kind]:false}));}
 }
 return <div className="customDesignEditor" data-testid="custom-design-editor">
  <div className="customDesignMode" role="group" aria-label="Create custom artwork">
   {['build','upload'].map(mode=><label key={mode} className={value.mode===mode?'isSelected':''}><input type="radio" checked={value.mode===mode} onChange={()=>chooseMode(mode)}/><span>{mode==='build'?'Build a design':'Upload artwork'}</span></label>)}
  </div>
  {value.mode==='upload'?<>
   <p className="customDesignHint">Upload PNG or JPEG artwork that already includes the desired name and date, with empty photo spaces. Portrait 4×6 artwork works best. Adjust the openings below so guests’ actual photos cover each space.</p>
   <div className="customUploadGrid">{[['one','1-photo artwork'],['four','4-photo artwork']].map(([kind,label])=><label className="customUploadCard" key={kind}>
    <strong>{label}</strong>{value.layouts[kind].image&&<img src={value.layouts[kind].image} alt={label+' frame'} className="customUploadThumb"/>}
    <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" aria-label={label} data-testid={'custom-upload-'+kind} required={!value.layouts[kind].image} onChange={e=>upload(kind,e.currentTarget)}/>
    <small role="status">{busy[kind]?'Preparing image…':value.layouts[kind].image?'Artwork ready · choose a file to replace it':'Choose a PNG or JPEG'}</small>
   </label>)}</div>
  </>:<>
   <div className="customColorGrid">{[['background','Background'],['accent','Border'],['ink','Text']].map(([key,label])=><label className="formField" key={key}>{label}<input className="input colorInput" type="color" value={value[key]} onChange={e=>field(key,e.target.value)} data-testid={'custom-color-'+key}/></label>)}</div>
   <label className="formField">Heading (optional)<input className="input" value={value.heading} maxLength={80} placeholder="Your celebration" onChange={e=>field('heading',e.target.value)} data-testid="custom-heading"/></label>
   <label className="formField">Footer message (optional)<input className="input" value={value.footer} maxLength={100} placeholder="Thank you for celebrating with us" onChange={e=>field('footer',e.target.value)} data-testid="custom-footer"/></label>
   <p className="customDesignHint">The name and date come from this event. Edit the event details or “Name on the photos” to change them.</p>
  </>}
  {error&&<p className="errorNote" role="alert">{error}</p>}
  <details className="customApertures" data-testid="custom-photo-openings"><summary>Adjust photo openings</summary><p>Position and size use percentages of the sheet. Openings must stay inside the sheet without overlapping.</p>
   {['one','four'].map(kind=><fieldset key={kind}><legend>{kind==='one'?'1 Photo':'4 Photos · vertical strip'}</legend>{value.layouts[kind].rects.map((position,index)=><div className="customPositionRow" key={index}><strong>{kind==='one'?'Photo':'Photo '+(index+1)}</strong>{[['x','Left'],['y','Top'],['w','Width'],['h','Height']].map(([key,label])=><label key={key}>{label}<input className="input" type="number" min={key==='w'||key==='h'?1:0} max="100" step=".1" value={position[key]} aria-label={(kind==='one'?'1 Photo':'4 Photos photo '+(index+1))+' '+label} onChange={e=>rect(kind,index,key,e.target.value)}/></label>)}</div>)}</fieldset>)}
  </details>
  <input ref={guard} type="text" className="customValidationGuard" aria-label="Custom artwork validation" value="" onChange={()=>{}} tabIndex={-1} onInvalid={()=>{guard.current?.closest('.customDesignEditor')?.scrollIntoView({block:'center',behavior:'smooth'});}}/>
  {validation&&!busyNow&&<p className="customDesignIncomplete" role="status">{validation}</p>}
 </div>;
}
