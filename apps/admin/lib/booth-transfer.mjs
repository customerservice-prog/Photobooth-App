// Deliberately PII-minimal, explicit cross-device event handoff.
// The payload is in the URL fragment, so neither service receives the data in
// HTTP requests or server logs. Treat the link as shareable event information.
import {BOOTH_URL,experienceFrom,toLocalDay,wallTime} from './studio-experience.mjs';
import {makeSyncTicket} from './event-sync-token.mjs';
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
 if(!Number.isInteger(prints)||prints<0||prints>10000)throw new Error('Set a valid physical print allowance before transferring.');
 const date=toLocalDay(event.date);
 if(!date)throw new Error('Set a valid event date before sending it to the booth.');
 const revision=event.updatedAt?new Date(event.updatedAt).toISOString():new Date(event.date).toISOString();
 return Object.freeze({
  v:1,id:String(event.id),rev:revision,
  title:clean(event.name,96),date,start:wallTime(event.startTime),end:wallTime(event.endTime),
  type:kind(event.eventType),
  f:e.featured,p:e.pauseSeconds,mode:e.format,s:e.strips,fit:e.photoFit,
  a:e.primary,b:e.accent,limit:prints,
  on:event.printingEnabled!==false&&prints>0,qr:event.qrSharingEnabled!==false,
  sync:process.env.PHOTOBOOTH_EVENT_SYNC_SECRET?makeSyncTicket(event.id,event.date):undefined,
  design:'champagne'
 });
}
export function makeBoothHandoffLink(event){
 const payload=buildBoothHandoffPayload(event);
 const token=Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');
 if(token.length>1500)throw new Error('The event link is too long to share. Shorten the event title.');
 return BOOTH_URL+'/handoff#'+token;
}
