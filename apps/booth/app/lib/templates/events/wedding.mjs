import {renderKeepsake as classic,getDesigns as classicDesigns} from '../../keepsake-classics.mjs';
import {fieldsForEvent} from '../fields.mjs';
// Preserve the already-tested painted botanicals and outlined calligraphy exactly.
const ids=['wedding_rosewater','wedding_editorial','wedding_blacktie'];
const photos=[{shape:'rect',x:145,y:145,width:910,height:1080},{shape:'rect',x:50,y:290,width:1100,height:1065},{shape:'rect',x:125,y:285,width:950,height:1000}];
export const weddingTemplates=Object.freeze(classicDesigns('wedding').map((d,i)=>Object.freeze({...d,legacyId:d.id,id:ids[i],eventType:'wedding',fields:fieldsForEvent('wedding'),photo:Object.freeze(photos[i]),typography:{heading:'serif',name:'script',body:'sans'},render:input=>classic({...input,cfg:{...input.cfg,type:'wedding'},template:d.id})})));
