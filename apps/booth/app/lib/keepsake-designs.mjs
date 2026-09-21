// One immutable compatibility API for both generations of saved event/template settings.
export {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
export {renderTemplateSvg as renderKeepsake} from './templates/render.mjs';
import {EVENT_LABELS} from './keepsake-model.mjs';
import {getTemplatesForEvent,resolveTemplate,normalizeEventType} from './templates/registry.mjs';
export const TEMPLATE_FAMILIES=Object.freeze(Object.fromEntries(Object.keys(EVENT_LABELS).map(type=>{const canonical=getTemplatesForEvent(type);return [type,Object.freeze({type,fields:canonical[0].supportedFields,templates:Object.freeze(canonical.map(t=>Object.freeze({...t,templateId:t.id,id:t.legacyId})))}];})));
const descriptors=new Map(Object.values(TEMPLATE_FAMILIES).flatMap(f=>f.templates).map(t=>[t.templateId,t]));
export function getDesigns(type='other'){return TEMPLATE_FAMILIES[normalizeEventType(type)].templates;}
export function getDesign(type,id){return descriptors.get(resolveTemplate(type,id).id);}
