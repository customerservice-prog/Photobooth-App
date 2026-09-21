// One public API shared by the gallery, setup previews, finished JPEG and print output.
// Sample image boards are NOT application assets or substitute templates.
import {renderKeepsake as renderWeddingBirthday} from './keepsake-atelier-base.mjs';
import {renderMitzvah} from './templates/mitzvah.mjs';
import {renderGraduation} from './templates/graduation.mjs';
import {renderCorporate} from './templates/corporate.mjs';
import {renderCelebration} from './templates/celebration.mjs';
import {getDesign} from './template-registry.mjs';
import {applySvgPhotoFinish} from './svg-photo-finish.mjs';
export {getDesigns,getDesign,TEMPLATE_FAMILIES} from './template-registry.mjs';
export {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
const renderers={wedding:renderWeddingBirthday,birthday:renderWeddingBirthday,mitzvah:renderMitzvah,graduation:renderGraduation,corporate:renderCorporate,other:renderCelebration};
export function renderKeepsake(input={}){
 const cfg=input.cfg&&typeof input.cfg==='object'?input.cfg:{};
 const spec=getDesign(cfg.type,input.template),safe={...input,cfg:{...cfg,type:spec.family},template:spec.id};
 const svg=renderers[spec.family](safe,spec);
 const identified=['wedding','birthday'].includes(spec.family)?svg.replace('data-collection="atelier"',`data-collection="event-families" data-template-key="${spec.key}"`):svg;
 return applySvgPhotoFinish(identified,input.filter,input.id);
}
