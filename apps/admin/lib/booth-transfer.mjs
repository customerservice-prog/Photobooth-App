// Deliberately PII-minimal, explicit cross-device event handoff.
// Standard display settings travel in the fragment. Custom artwork is fetched
// through the existing signed event endpoint; never include image bytes in a QR.
import {BOOTH_URL,experienceFrom,toLocalDay,wallTime} from './studio-experience.mjs';
import {makeSyncTicket} from './event-sync-token.mjs';
import {validateCustomDesign} from '../../booth/app/lib/custom-design.mjs';
import {validateBoothHandoff} from '../../booth/app/lib/booth-handoff.mjs';
const idRe=/^[A-Za-z0-9_-]{3,90}$/;
const clean=(input,n=96)=>String(input??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,n);
const kind=(eventType)=>{
 const t=String(eventType||'').toLowerCase();
 if(t.includes('wedding'))return 'wedding';
 if(t.includes('birthday'))return 'birthday';
 if(t.includes('mitzvah'))return 'mitzvah';
 if(t.includes('graduation'))return 'graduation';
 if(t.includes('corporate'))return 'corporate';
 return 'other';
};
export function buildBoothHandoffPayload(event){
 if(!event||!idRe.test(String(event.id||'')))throw new Error('This event has an invalid ID and cannot be transferred.');
 const e=experienceFrom(event),prints=Number(event.maxPrints??108);
 const custom=e.approvedDesign==='custom'?validateCustomDesign(e.customDesign):undefined;
 if(!Number.isInteger(prints)||prints<0||prints>10000)throw new Error('Set a valid physical print allowance before transferring.');
 const date=toLocalDay(event.date);
 if(!date)throw new Error('Set a valid event date before sending it to the booth.');
 const revision=event.updatedAt?new Date(event.updatedAt).toISOString():new Date(event.date).toISOString();
 return Object.freeze(validateBoothHandoff({
  v:1,id:String(event.id),rev:revision,
  title:clean(event.name,96),date,start:wallTime(event.startTime),end:wallTime(event.endTime),
  type:kind(event.eventType),
  f:e.featured,p:e.pauseSeconds,mode:e.format,s:e.strips,fit:e.photoFit,
  a:e.primary,b:e.accent,limit:prints,
  on:event.printingEnabled!==false&&prints>0,qr:event.qrSharingEnabled!==false,
  sync:process.env.PHOTOBOOTH_EVENT_SYNC_SECRET?makeSyncTicket(event.id,event.date):undefined,
  // Staff approves exactly one graphic before guests arrive; the booth renders
  // this choice as a full card (one pose) or four-photo keepsake (four poses).
  design:e.approvedDesign,name:clean(e.nameOnPrint||event.name,65),
  year:e.classYear||'',guest:'approved',...(custom?{customDesign:custom}:{})
 }));
}
export function makeBoothHandoffLink(event){
 const payload=buildBoothHandoffPayload(event);
 if(payload.design==='custom'&&!payload.sync)throw new Error('Custom iPad setup needs the protected event sync connection. Ask the owner to finish that setup.');
 const shared=payload.design==='custom'?{v:2,id:payload.id,sync:payload.sync}:payload;
 const token=Buffer.from(JSON.stringify(shared),'utf8').toString('base64url');
 if(token.length>1500)throw new Error('The event link is too long to share. Shorten the event title.');
 return BOOTH_URL+'/handoff#'+token;
}
