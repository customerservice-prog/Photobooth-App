// Compatibility facade: existing iPad settings retain their slot IDs, while registry IDs are unique.
export {EVENT_LABELS,eventCopy,fitText} from './keepsake-model.mjs';
export {renderTemplateSvg as renderKeepsake} from './templates/render.mjs';
import {getTemplatesForEvent,resolveTemplate} from './templates/registry.mjs';
const guestDescriptor=t=>({...t,templateId:t.id,id:t.legacyId});
export function getDesigns(type='other'){return getTemplatesForEvent(type).map(guestDescriptor);}
export function getDesign(type,id){return guestDescriptor(resolveTemplate(type,id));}
