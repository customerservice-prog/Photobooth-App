// Owner proofs use the same handoff configuration and renderer as the event iPad.
import {configFromBoothHandoff} from '../../booth/app/lib/booth-handoff.mjs';
import {guestEventConfig} from '../../booth/app/lib/guest-design.mjs';
import {getDesigns,renderKeepsake} from '../../booth/app/lib/keepsake-designs.mjs';
import {eventMonogram} from '../../booth/app/lib/event-config.mjs';
import {approvedDesignFor,standardDesignFor} from './studio-experience.mjs';
import {validateCustomDesign} from '../../booth/app/lib/custom-design.mjs';

const clean=(value,max)=>String(value??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
export function ownerEventFamily(eventType){
 const type=String(eventType||'').toLowerCase();
 return ['wedding','birthday','mitzvah','graduation','corporate'].find(kind=>type.includes(kind))||'other';
}
export function ownerApprovedDesigns(eventType){return getDesigns(ownerEventFamily(eventType)).filter(design=>design.id!=='quince-royal'||/quince/i.test(String(eventType||'')));}
export function ownerRecommendedDesign(eventType){return ownerApprovedDesigns(eventType).find(design=>design.id===standardDesignFor(eventType));}
export function ownerPreviewConfig({eventType,eventName,eventDate,experience={}}={}){
 const day=String(eventDate||''),date=new Date(day+'T12:00:00.000Z');
 const validDay=/^\d{4}-\d\d-\d\d$/.test(day)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;
 const title=clean(eventName,96)||'Your celebration';
 const custom=approvedDesignFor(eventType,experience.approvedDesign)==='custom';
 const cfg=configFromBoothHandoff({
  id:'owner-design-preview',rev:'',title,date:validDay?day:'2000-01-01',start:'18:00',end:'22:00',
  type:ownerEventFamily(eventType),name:clean(experience.nameOnPrint||title,65),
  design:custom?standardDesignFor(eventType):approvedDesignFor(eventType,experience.approvedDesign),year:experience.classYear||'',
  a:experience.primary||'#32463e',b:experience.accent||'#d4ad73',fit:experience.photoFit||'fill',
  f:experience.featured||'four',p:experience.pauseSeconds||6,mode:experience.format||'card',
  s:experience.strips||1,limit:108,on:true,qr:true
 });
 if(!validDay)cfg.date='Date not set';
 const approved=guestEventConfig(cfg);
 return custom?{...approved,defaultTemplate:'custom',customDesign:validateCustomDesign(experience.customDesign,{allowIncompleteUpload:true})}:approved;
}
export function renderOwnerDesign(cfg,shots=1,id='owner-design'){
 return renderKeepsake({cfg,photo:'',poses:[],sample:true,template:cfg.defaultTemplate,
  monogram:eventMonogram(cfg),layout:shots===1?'card':'photo_strip',stripMode:'single',filter:'none',id});
}
