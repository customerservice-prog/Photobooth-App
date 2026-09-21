import {weddingTemplates} from './events/wedding.mjs';
import {birthdayTemplates} from './events/birthday.mjs';
import {mitzvahTemplates} from './events/mitzvah.mjs';
import {graduationTemplates} from './events/graduation.mjs';
import {corporateTemplates} from './events/corporate.mjs';
import {otherTemplates} from './events/other.mjs';
import {EVENT_LABELS} from './fields.mjs';
export const TEMPLATE_VERSION='event-collections-v1';
const groups=Object.freeze({wedding:weddingTemplates,birthday:birthdayTemplates,mitzvah:mitzvahTemplates,graduation:graduationTemplates,corporate:corporateTemplates,other:otherTemplates});
export const allTemplates=Object.freeze(Object.values(groups).flat());
const index=new Map(allTemplates.map(t=>[t.id,t]));
// Fail the build immediately rather than ship a broken or ambiguous template collection.
if(index.size!==18||Object.entries(groups).some(([type,items])=>items.length!==3||new Set(items.map(t=>t.layout)).size!==3||items.some(t=>t.eventType!==type||typeof t.render!=='function'||!t.fields||!t.photo||t.photo.width<500||t.photo.height<500)))throw new Error('Invalid template registry');
export const normalizeEventType=type=>Object.hasOwn(EVENT_LABELS,type)?type:'other';
export function getTemplatesForEvent(type){return groups[normalizeEventType(type)];}
export function getTemplateById(id){return index.get(id);}
export function getDefaultTemplateForEvent(type){return getTemplatesForEvent(type)[0];}
// Accept old ivory/blush/champagne slot IDs and new globally unique IDs. Never cross event families.
export function resolveTemplate(type,id){const group=getTemplatesForEvent(type);return group.find(t=>t.id===id||t.legacyId===id)||group[0];}
export const canonicalTemplateId=(type,id)=>resolveTemplate(type,id).id;
export const legacyTemplateId=(type,id)=>resolveTemplate(type,id).legacyId;
export function catalog(){return Object.entries(groups).map(([eventType,templates])=>({eventType,label:EVENT_LABELS[eventType],templates:templates.map(({id,legacyId,name,description,layout,photo,typography,fields})=>({id,legacyId,name,description,layout,photo,typography,fields}))}));}
