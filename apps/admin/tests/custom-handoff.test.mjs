import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {approvedDesignFor,standardDesignFor,experienceFrom,mergeExperience,readiness} from '../lib/studio-experience.mjs';
import {buildBoothHandoffPayload,makeBoothHandoffLink} from '../lib/booth-transfer.mjs';
import {checkSyncTicket} from '../lib/event-sync-token.mjs';
import {createCustomDesign,validateCustomDesign,isValidCustomDesign} from '../../booth/app/lib/custom-design.mjs';

const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function artwork(mode='build'){
 const spec=createCustomDesign(mode);
 spec.heading='Taylor & Friends';spec.footer='A celebration to remember';
 spec.background='#16324f';spec.ink='#f4eddf';spec.accent='#ffb24b';
 if(mode==='upload'){spec.layouts.one.image=png;spec.layouts.four.image=png;}
 return spec;
}
function eventWith(customDesign=artwork()){
 return {id:'custom-rental-event',name:'Taylor Celebration',eventType:'Graduation',
  date:new Date(Date.now()+30*86400000),startTime:new Date('2027-06-10T17:00:00.000Z'),endTime:new Date('2027-06-10T21:00:00.000Z'),
  updatedAt:new Date('2026-10-09T12:00:00.000Z'),customerId:'private-customer-reference',boothId:'private-booth-reference',
  templateId:'private-legacy-template',customer:{name:'Private Customer',email:'private@example.invalid',phone:'PRIVATE-PHONE'},
  venueName:'Venue',venueAddress:'PRIVATE-STREET-ADDRESS',internalNotes:'PRIVATE-STAFF-NOTES',
  sessions:[{id:'private-session',image:'PRIVATE-GUEST-PHOTO'}],maxPrints:108,printingEnabled:true,qrSharingEnabled:true,
  theme:{logo:'legacy-logo',boothExperience:{approvedDesign:'custom',customDesign,nameOnPrint:'Taylor',classYear:'2027'}}};
}
async function withSyncSecret(work){
 const prior=process.env.PHOTOBOOTH_EVENT_SYNC_SECRET,secret=randomBytes(32).toString('hex');
 process.env.PHOTOBOOTH_EVENT_SYNC_SECRET=secret;
 try{return await work(secret);}finally{
  if(prior===undefined)delete process.env.PHOTOBOOTH_EVENT_SYNC_SECRET;
  else process.env.PHOTOBOOTH_EVENT_SYNC_SECRET=prior;
 }
}
test('new event defaults match each occasion and valid saved design IDs remain selected',()=>{
 const cases=[['Graduation','grad-gala'],['Wedding','ivory'],['Birthday','ivory'],
  ['Bar / Bat Mitzvah','blush'],['Corporate','blush'],['Party','ivory'],['Quinceañera','quince-royal']];
 for(const [eventType,expected]of cases){
  assert.equal(standardDesignFor(eventType),expected,eventType);
  assert.equal(experienceFrom({eventType}).approvedDesign,expected,eventType+' default view');
  const created=mergeExperience({},new Map([['eventType',eventType]]));
  assert.equal(created.boothExperience.approvedDesign,expected,eventType+' new booking');
  for(const legacy of ['ivory','blush','champagne']){
   assert.equal(approvedDesignFor(eventType,legacy),legacy);
   const existing=mergeExperience({boothExperience:{approvedDesign:legacy}},new Map([['eventType',eventType]]));
   assert.equal(existing.boothExperience.approvedDesign,legacy,eventType+' existing '+legacy);
  }
 }
 assert.equal(approvedDesignFor('Wedding','grad-gala'),'ivory');
 assert.equal(approvedDesignFor('Graduation','grad-gala'),'grad-gala');
 assert.equal(approvedDesignFor('Wedding','quince-royal'),'ivory');
 assert.equal(approvedDesignFor('Quinceañera','quince-royal'),'quince-royal');
});
test('paired custom artwork persists without changing metadata or saved fields omitted by the editor',()=>{
 const spec=artwork('upload'),before=JSON.stringify(spec);
 const theme={privateMetadata:{reference:'keep-this'},boothExperience:{legacyFlag:'keep-this-too',
  featured:'one',pauseSeconds:12,format:'strip',strips:2,photoFit:'fit',paletteId:'rose',
  primary:'#123456',accent:'#abcdef',nameOnPrint:'Original name',classYear:'2027'}};
 const original=JSON.stringify(theme);
 const next=mergeExperience(theme,new Map([['eventType','Graduation'],['approvedDesign','custom'],['customDesign',JSON.stringify(spec)]]));
 assert.equal(next.boothExperience.approvedDesign,'custom');
 assert.deepEqual(next.boothExperience.customDesign,validateCustomDesign(spec));
 for(const key of Object.keys(theme.boothExperience))assert.deepEqual(next.boothExperience[key],theme.boothExperience[key],key+' must survive omission');
 assert.deepEqual(next.privateMetadata,theme.privateMetadata);
 assert.deepEqual(mergeExperience(next,new Map([['eventType','Graduation']])),next,'omitting custom artwork must retain both saved layouts');
 assert.equal(JSON.stringify(theme),original);assert.equal(JSON.stringify(spec),before);
});
test('invalid or missing custom layout blocks saving, handoff and readiness even with a legacy template',()=>{
 const invalid=artwork();invalid.layouts.four.rects=invalid.layouts.four.rects.slice(0,3);
 assert.equal(isValidCustomDesign(invalid),false);
 assert.throws(()=>mergeExperience({},new Map([['eventType','Graduation'],['approvedDesign','custom'],['customDesign',JSON.stringify(invalid)]])));
 assert.throws(()=>mergeExperience({},new Map([['approvedDesign','custom'],['customDesign','']])),/custom/i);
 assert.throws(()=>mergeExperience({},new Map([['approvedDesign','custom'],['customDesign','not-json']])));
 const event=eventWith(invalid),progress=readiness(event);
 assert.equal(progress.ready,false);
 assert.equal(progress.checks.find(item=>item.id==='design').ready,false,'a legacy template cannot mask an invalid selected custom design');
 assert.throws(()=>buildBoothHandoffPayload(event));
 const valid=eventWith(artwork());
 assert.equal(readiness(valid).ready,true);
});
test('custom server payload contains normalized paired artwork while the QR contains only a signed event descriptor',()=>withSyncSecret(secret=>{
 const event=eventWith(artwork('upload')),before=JSON.stringify(event);
 const payload=buildBoothHandoffPayload(event);
 assert.equal(payload.v,1);assert.equal(payload.design,'custom');
 assert.deepEqual(payload.customDesign,validateCustomDesign(event.theme.boothExperience.customDesign));
 assert.equal(payload.customDesign.layouts.one.rects.length,1);
 assert.equal(payload.customDesign.layouts.four.rects.length,4);
 assert.equal(payload.customDesign.layouts.one.image,png);assert.equal(payload.customDesign.layouts.four.image,png);
 const link=new URL(makeBoothHandoffLink(event));
 assert.equal(link.pathname,'/handoff');assert.equal(link.search,'');assert(link.hash.length<=1501);
 const descriptor=JSON.parse(Buffer.from(link.hash.slice(1),'base64url').toString('utf8'));
 assert.deepEqual(Object.keys(descriptor).sort(),['id','sync','v']);
 assert.equal(descriptor.v,2);assert.equal(descriptor.id,event.id);
 assert.equal(checkSyncTicket(descriptor.sync,event.id),true);
 assert.equal(checkSyncTicket(descriptor.sync,'another-rental-event'),false);
 for(const shared of [JSON.stringify(payload),JSON.stringify(descriptor)]){
  for(const privateValue of [secret,event.customerId,event.boothId,event.templateId,event.customer.email,
   event.customer.phone,event.venueAddress,event.internalNotes,event.sessions[0].image])assert(!shared.includes(privateValue));
 }
 const qr=JSON.stringify(descriptor);
 assert(!qr.includes('data:image'));assert(!qr.includes(event.theme.boothExperience.customDesign.heading));
 assert.equal(JSON.stringify(event),before,'exporting artwork must not modify the saved event or legacy references');
}));
test('custom QR creation fails clearly when the protected setup connection is not configured',()=>{
 const prior=process.env.PHOTOBOOTH_EVENT_SYNC_SECRET;
 delete process.env.PHOTOBOOTH_EVENT_SYNC_SECRET;
 try{assert.throws(()=>makeBoothHandoffLink(eventWith()),/protected|sync|connection/i);}
 finally{if(prior!==undefined)process.env.PHOTOBOOTH_EVENT_SYNC_SECRET=prior;}
});
