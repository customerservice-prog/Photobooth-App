// One public API shared by the gallery, setup previews, finished JPEG and print output.
// Sample image boards are NOT application assets or substitute templates.
import {renderKeepsake as renderWeddingBirthday} from './keepsake-atelier-base.mjs';
import {renderMitzvah} from './templates/mitzvah.mjs';
import {renderGraduation} from './templates/graduation.mjs';
import {renderCorporate} from './templates/corporate.mjs';
import {renderCelebration} from './templates/celebration.mjs';
import {getDesign} from './template-registry.mjs';
import {renderClassicPhotoStrip} from './classic-photo-strip.mjs';
import {renderLamarrFour,renderLamarrOne} from './lamarr-graduation.mjs';
import {applySvgPhotoFinish} from './svg-photo-finish.mjs';
import {applyEventPaletteTrim} from './setup-lookbook.mjs';
import {renderCustomDesign} from './custom-design.mjs';
export {getDesigns,getDesign,TEMPLATE_FAMILIES} from './template-registry.mjs';
export {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
const renderers={wedding:renderWeddingBirthday,birthday:renderWeddingBirthday,mitzvah:renderMitzvah,graduation:renderGraduation,corporate:renderCorporate,other:renderCelebration};
export function renderKeepsake(input={}){
 if((input.template??input.cfg?.defaultTemplate)==='custom')
  return applySvgPhotoFinish(renderCustomDesign(input),input.filter,input.id);
 // This is an actual selectable design, never silently triggered by a
 // customer's name. The captured images stay distinct and in their order.
 if(input.cfg?.type==='graduation'&&input.template==='grad-gala'){
  const art=input.layout==='photo_strip'
   ? input.stripMode==='double'
     ? renderClassicPhotoStrip({...input,template:'champagne'})
     : renderLamarrFour(input.poses,input.cfg)
   :renderLamarrOne(input.photo,input.cfg);
  return applySvgPhotoFinish(art,input.filter,input.id);
 }
 const approvedFour=input.cfg?.guestMode==='approved'&&input.layout==='photo_strip';
 if(input.layout==='photo_strip'&&!approvedFour)return applySvgPhotoFinish(renderClassicPhotoStrip(input),input.filter,input.id);
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{};
 const spec=getDesign(cfg.type,input.template),safe={...input,approvedFour,cfg:{...cfg,type:spec.family},template:spec.id};
 const svg=renderers[spec.family](safe,spec);
 const identified=['wedding','birthday'].includes(spec.family)?svg.replace('data-collection="atelier"',`data-collection="event-families" data-template-key="${spec.key}"`):svg;
 return applyEventPaletteTrim(applySvgPhotoFinish(identified,input.filter,input.id),cfg.details);
}
