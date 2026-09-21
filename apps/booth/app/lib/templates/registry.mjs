import {weddingTemplates} from './events/wedding.mjs';
import {birthdayTemplates} from './events/birthday.mjs';
import {mitzvahTemplates} from './events/mitzvah.mjs';
import {graduationTemplates} from './events/graduation.mjs';
import {corporateTemplates} from './events/corporate.mjs';
import {otherTemplates} from './events/other.mjs';
import {EVENT_LABELS} from './fields.mjs';
import {TEMPLATE_FAMILIES as previousFamilies} from '../template-registry.mjs';
export const TEMPLATE_VERSION='event-collections-v1';
const source={wedding:weddingTemplates,birthday:birthdayTemplates,mitzvah:mitzvahTemplates,graduation:graduationTemplates,corporate:corporateTemplates,other:otherTemplates};
// Preserve the composition keys added on main while also supporting globally unique registry IDs.
const groups=Object.freeze(Object.fromEntries(Object.entries(source).map(([type,items])=>[type,Object.freeze(items.map((t,i)=>Object.freeze({...t,key:previousFamilies[type].templates[i].key,family:type,supportedFields:Object.freeze([...new Set([...t.fields.map(f=>f.key),'date'])]),format:Object.freeze({width:1200,height:1800,inches:'4 × 6'})})))])));
export const allTemplates=Object.freeze(Object.values(groups).flat());
const index=new Map(allTemplates.map(t=>[t.id,t]));
if(index.size!==18||Object.entries(groups).some(([type,items])=>items.length!==3||new Set(items.map(t=>t.layout)).size!==3||items.some(t=>t.eventType!==type||typeof t.render!=='function'||!t.fields||!t.photo||t.photo.width<500||t.photo.height<500)))throw new Error('Invalid template registry');
export const normalizeEventType=type=>Object.hasOwn(EVENT_LABELS,type)?type:'other';
export function getTemplatesForEvent(type){return groups[normalizeEventType(type)];}
export function getTemplateById(id){return index.get(id);}
export function getDefaultTemplateForEvent(type){return getTemplatesForEvent(type)[0];}
export function resolveTemplate(type,id){const group=getTemplatesForEvent(type);return group.find(t=>t.id===id||t.legacyId===id||t.key===id)||group[0];}
export const canonicalTemplateId=(type,id)=>resolveTemplate(type,id).id;
export const legacyTemplateId=(type,id)=>resolveTemplate(type,id).legacyId;
export function catalog(){return Object.entries(groups).map(([eventType,templates])=>({eventType,label:EVENT_LABELS[eventType],templates:templates.map(({id,key,legacyId,name,description,layout,photo,typography,fields})=>({id,key,legacyId,name,description,layout,photo,typography,fields}))}));}
