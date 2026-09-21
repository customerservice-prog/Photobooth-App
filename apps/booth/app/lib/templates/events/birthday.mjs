import {renderKeepsake as classic,getDesigns as classicDesigns} from '../../keepsake-classics.mjs';
import {fieldsForEvent} from '../fields.mjs';
const ids=['birthday_balloon','birthday_retro','birthday_disco'];
const photos=[{shape:'round',x:156,y:330,width:888,height:915,radius:34},{shape:'round',x:120,y:345,width:960,height:885,radius:24},{shape:'rect',x:112,y:315,width:976,height:955}];
export const birthdayTemplates=Object.freeze(classicDesigns('birthday').map((d,i)=>Object.freeze({...d,legacyId:d.id,id:ids[i],eventType:'birthday',fields:fieldsForEvent('birthday'),photo:Object.freeze(photos[i]),typography:{heading:i===0?'script':'serif',name:i===1?'serif':'script',body:'sans'},render:input=>classic({...input,cfg:{...input.cfg,type:'birthday'},template:d.id})})));
