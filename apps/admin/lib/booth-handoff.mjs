import {BOOTH_URL,experienceFrom} from './studio-experience.mjs';
const clean=(v,n=90)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const color=(v,fallback)=>/^#[a-f0-9]{6}$/i.test(String(v||''))?v.toLowerCase():fallback;
export const HANDOFF_VERSION=1;
export function makeEventHandoff(event){
 if(!event||!/^[a-z0-9_-]{5,90}$/i.test(String(event.id||'')))throw Error('The event ID cannot be transferred.');
 if(!(event.date instanceof Date)||!Number.isFinite(event.date.getTime()))throw Error('The event date is invalid.');
 const title=clean(event.name,90);if(!title)throw Error('Name this event before transferring it.');
 const experience=experienceFrom(event);
 const count=Number(event.maxPrints??108);
 if(!Number.isSafeInteger(count)||count<0||count>10000)throw Error('Print allowance must be a whole number from 0 to 10,000.');
 const design=['ivory','blush','champagne'].includes(event.theme?.boothExperience?.design)?event.theme.boothExperience.design:'champagne';
 return Object.freeze({
  v:HANDOFF_VERSION,i:event.id,t:title,d:event.date.toISOString().slice(0,10),
  o:clean(event.eventType||'Celebration',34),
  f:experience.featured==='one'?1:4,b:experience.pauseSeconds,
  l:experience.format==='strip'?'strip':'card',s:experience.strips===2?2:1,
  x:experience.photoFit==='fit'?'fit':'fill',
  c:[color(experience.primary,'#32463e'),color(experience.accent,'#d4ad73')],
  g:design,
  n:count,p:event.printingEnabled!==false&&count>0,
  q:event.qrSharingEnabled!==false
 });
}
export function encodeHandoff(payload){
 if(payload?.v!==HANDOFF_VERSION||!/^[a-z0-9_-]{5,90}$/i.test(payload.i))throw Error('Invalid event handoff.');
 return Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
}
export function makeHandoffLink(event){
 const data=makeEventHandoff(event),token=encodeHandoff(data);
 if(token.length>1400)throw Error('Event handoff is too long to scan.');
 return BOOTH_URL+'/load-event#'+token;
}
export function handoffFileName(event){
 return 'friendly-booth-'+String(event.id).replace(/[^a-z0-9_-]/gi,'').slice(0,40)+'.json';
}
