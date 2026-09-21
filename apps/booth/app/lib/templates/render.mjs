import {resolveTemplate,normalizeEventType} from './registry.mjs';
import {applySvgPhotoFinish} from '../svg-photo-finish.mjs';
import {containedPhotoBox} from './svg-kit.mjs';
/** Shared by gallery, large preview, selected print and finished JPEG; includes newer WebKit fixes. */
export function renderTemplateSvg(input={}){
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{},type=normalizeEventType(cfg.type),template=resolveTemplate(type,input.template);
 let rendered=template.render({...input,cfg:{...cfg,type}});
 if(!rendered.includes('data-template-id='))rendered=rendered.replace('<svg ','<svg data-template-id="'+template.id+'" ');
 if(!rendered.includes('data-template-key='))rendered=rendered.replace('<svg ','<svg data-template-key="'+template.key+'" ');
 // Preserve main's whole-photo geometry inside an arch, rather than dropping the arch itself.
 if((cfg.photoFit==='fit'||input.photo==='/print-test.svg')&&template.photo.shape==='arch'){
  const {x,y,width:w,height:h}=template.photo,id=String(input.id||'card').replace(/[^a-zA-Z0-9_-]/g,'')||'card';
  const box=containedPhotoBox({x,y,w,h,shape:'arch'},true);
  const shape=`<path d="M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z"/>`;
  rendered=rendered.replace(new RegExp('<clipPath id="'+id+'-photo">[\\s\\S]*?</clipPath>'),'<clipPath id="'+id+'-photo">'+shape+'</clipPath>');
  rendered=rendered.replace(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/,tag=>tag.replace(/\s(x|y|width|height)="[^"]*"/g,(match,key)=>' '+key+'="'+({x:box.x,y:box.y,width:box.w,height:box.h})[key]+'"'));
 }
 return applySvgPhotoFinish(rendered,input.filter,input.id);
}
