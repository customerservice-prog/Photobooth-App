import {fieldsForEvent} from './templates/fields.mjs';
import {resolveTemplate} from './templates/registry.mjs';
const defaults={wedding:['Wedding Celebration','Celebrating together'],birthday:['Birthday Celebration','Let’s celebrate'],mitzvah:['Mitzvah Celebration','Mazel tov!'],graduation:['Graduation Celebration','Congratulations'],corporate:['Company Celebration','Together, in the moment'],other:['Our Celebration','Celebrating together']};
const value=(v,max=80)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
const validType=t=>Object.hasOwn(defaults,t)?t:'other';
export function switchEventDraft(cfg,type){
 type=validType(type);const previous=validType(cfg.type);if(type===previous&&cfg.type===previous)return {...cfg,type};
 const profiles={...cfg.eventProfiles,[previous]:{title:cfg.title,subtitle:cfg.subtitle,details:{...cfg.details}}};
 const saved=type===previous&&cfg.type!==previous?null:profiles[type];const t=resolveTemplate(type,cfg.defaultTemplate);
 return {...cfg,type,title:saved?.title||defaults[type][0],subtitle:saved?.subtitle||defaults[type][1],details:{...(saved?.details||{})},eventProfiles:profiles,defaultTemplate:t.legacyId,defaultTemplateId:t.id};
}
export function composeEventConfig(cfg,input){
 const type=validType(cfg.type),details={};
 // Accept the earlier proposed field aliases without replacing the existing saved keys.
 input={...input};if(!input.honoree)input.honoree=input.celebrant||input.hostName;if(type==='birthday'&&!input.theme)input.theme=input.caption;
 for(const f of fieldsForEvent(type))details[f.key]=value(input[f.key]??f.defaultValue,f.maxLength||80);
 if(['wedding','mitzvah','corporate'].includes(type)&&input.theme)details.theme=value(input.theme);
 if(details.age&&!/^\d{1,3}$/.test(details.age))throw new Error('Age must contain numbers only, or leave it blank.');
 if(details.classYear&&!/^\d{4}$/.test(details.classYear))throw new Error('Enter a four-digit class year, or leave it blank.');
 if(type==='mitzvah')details.mitzvahType=details.mitzvahType||'Bar Mitzvah';
 let title=defaults[type][0],subtitle=defaults[type][1];
 if(type==='wedding'){title=[details.partner1,details.partner2].filter(Boolean).join(' & ')||title;subtitle=details.venue||'Wedding Celebration';}
 if(type==='birthday'){title=details.honoree?`${details.honoree}${details.age?' · Turning '+details.age:''} Birthday`:title;subtitle=details.theme||'Birthday Celebration';}
 if(type==='mitzvah'){title=details.honoree?`${details.honoree} · ${details.mitzvahType||'Mitzvah'}`:title;subtitle=details.hebrewName?details.hebrewName+' · Mazel tov!':'Mazel tov!';}
 if(type==='graduation'){title=details.graduate?details.graduate+' · Graduation':title;subtitle=[details.school,details.classYear?'Class of '+details.classYear:''].filter(Boolean).join(' · ')||'Graduation Celebration';}
 if(type==='corporate'){title=details.company||details.eventName||title;subtitle=details.company&&details.eventName?details.eventName:'Corporate Event';}
 if(type==='other'){title=details.eventName||details.honoree||title;subtitle=[details.eventName?details.honoree:'',details.subtitle].filter(Boolean).join(' · ')||subtitle;}
 const date=value(input.date??cfg.date,60),next={...cfg,type,title,subtitle,date,details};next.eventProfiles={...cfg.eventProfiles,[type]:{title,subtitle,details:{...details}}};return next;
}
export function eventMonogram(cfg){const words=cfg.type==='wedding'&&cfg.details?.partner1&&cfg.details?.partner2?[cfg.details.partner1,cfg.details.partner2]:String(cfg.title||'').split(/\s+/).filter(w=>w&&!['&','and'].includes(w.toLowerCase()));return words.slice(0,2).map(w=>[...w][0]?.toUpperCase()).join('')||'FP';}
export function normalizeEventConfig(cfg){
 const type=validType(cfg.type),primary={birthday:'honoree',mitzvah:'honoree',graduation:'graduate',corporate:'company',other:'eventName'}[type];
 if(type!=='wedding'&&cfg.title==='Bryan Wedding'&&!cfg.details?.[primary])return switchEventDraft({...cfg,type:'wedding'},type);
 const t=resolveTemplate(type,cfg.defaultTemplate??cfg.defaultTemplateId);return {...cfg,type,defaultTemplate:t.legacyId,defaultTemplateId:t.id};
}
export function finalizeEventSetup(draft){
 const next=composeEventConfig(draft,{...draft.details,date:draft.date}),d=next.details;
 const complete=next.type==='wedding'?!!(d.partner1&&d.partner2):['birthday','mitzvah'].includes(next.type)?!!d.honoree:next.type==='graduation'?!!d.graduate:next.type==='corporate'?!!(d.company||d.eventName):!!d.eventName;
 if(!complete)throw new Error(next.type==='wedding'?'Enter both names so every keepsake has the right couple.':'Enter the event name or person’s name above.');
 if(!next.date)throw new Error('Add the event date.');
 const t=resolveTemplate(next.type,draft.defaultTemplate??draft.defaultTemplateId);
 return {...next,setupComplete:true,defaultTemplate:t.legacyId,defaultTemplateId:t.id};
}
