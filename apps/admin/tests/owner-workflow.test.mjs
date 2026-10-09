import test from 'node:test';
import assert from 'node:assert/strict';
import {dateTimeFields,mergeExperience,readiness} from '../lib/studio-experience.mjs';
import {buildBoothHandoffPayload,makeBoothHandoffLink} from '../lib/booth-transfer.mjs';

function freeze(value){
 if(value&&typeof value==='object'){
  for(const child of Object.values(value))freeze(child);
  Object.freeze(value);
 }
 return value;
}
function savedTheme(){
 return freeze({
  logo:{asset:'legacy-logo',position:'top'},
  customWorkflow:{reference:'customer-artwork-v3'},
  boothExperience:{
   featured:'one',pauseSeconds:12,format:'strip',strips:2,photoFit:'fit',
   paletteId:'rose',primary:'#13579b',accent:'#2468ac',
   approvedDesign:'grad-gala',nameOnPrint:'Taylor',classYear:'2027',
   customDesign:{reference:'legacy-overlay',approvedBy:'owner'}
  }
 });
}
const formFactories={
 Map:entries=>new Map(entries),
 FormData:entries=>{const form=new FormData();for(const [key,value]of entries)form.set(key,value);return form;}
};
for(const [kind,formFrom]of Object.entries(formFactories)){
 test(kind+' edits preserve omitted saved experience fields and custom metadata',()=>{
  const theme=savedTheme(),before=JSON.stringify(theme);
  const next=mergeExperience(theme,formFrom([['eventType','Graduation']]));
  assert.deepEqual(next,theme,'omission must preserve the existing customer artwork and legacy settings');
  assert.equal(JSON.stringify(theme),before,'merging must not mutate the saved theme');
  assert.notEqual(next,theme);
  assert.notEqual(next.boothExperience,theme.boothExperience);
 });
}
test('changing only the printed name leaves other approved and legacy settings intact',()=>{
 const theme=savedTheme(),before=JSON.stringify(theme);
 const next=mergeExperience(theme,new Map([['eventType','Graduation'],['nameOnPrint','Morgan']]));
 assert.deepEqual(next,{...theme,boothExperience:{...theme.boothExperience,nameOnPrint:'Morgan'}});
 assert.equal(JSON.stringify(theme),before);
});
test('explicit empty print name and class year clear them and restore the event-name fallback',()=>{
 const theme=savedTheme(),before=JSON.stringify(theme);
 const next=mergeExperience(theme,new Map([['eventType','Graduation'],['nameOnPrint',''],['classYear','']]));
 assert.deepEqual(next,{...theme,boothExperience:{...theme.boothExperience,nameOnPrint:'',classYear:''}});
 const event={id:'event-cleared-name',name:'Graduation Celebration',eventType:'Graduation',
  ...dateTimeFields('2027-06-10','17:00','21:00'),theme:next};
 const payload=buildBoothHandoffPayload(event);
 assert.equal(payload.name,event.name);
 assert.equal(payload.year,'');
 assert.equal(payload.design,'grad-gala');
 assert.equal(JSON.stringify(theme),before);
});
test('handoffs preserve distinct event and tenant references while excluding private data and legacy templates',()=>{
 const schedule=dateTimeFields('2027-06-10','20:00','00:00');
 const events=['a','b'].map((suffix,index)=>freeze({
  id:'rental-event-'+suffix,name:'Celebration '+suffix,eventType:'Graduation',
  ...schedule,updatedAt:new Date('2026-10-09T12:00:00Z'),
  organizationId:'private-organization-'+suffix,customerId:'private-customer-'+suffix,
  boothId:'private-booth-'+suffix,templateId:'private-template-'+suffix,
  customer:{name:'Private Customer '+suffix,email:'private-'+suffix+'@example.invalid',phone:'PRIVATE-PHONE-'+suffix},
  template:{id:'private-template-'+suffix,layout:{asset:'PRIVATE-TEMPLATE-ART-'+suffix}},
  venueAddress:'PRIVATE-STREET-'+suffix,internalNotes:'PRIVATE-NOTES-'+suffix,
  sessions:[{id:'PRIVATE-SESSION-'+suffix,captures:[{data:'PRIVATE-PHOTO-'+suffix}]}],
  theme:savedTheme(),maxPrints:index===0?0:216,printingEnabled:true,qrSharingEnabled:true
 }));
 const before=events.map(event=>JSON.stringify(event));
 for(const [index,event]of events.entries()){
  const payload=buildBoothHandoffPayload(event),link=new URL(makeBoothHandoffLink(event));
  assert.equal(payload.id,event.id);
  assert.equal(payload.limit,event.maxPrints);
  assert.equal(payload.on,index!==0,'zero allowance must keep physical printing disabled');
  assert.equal(payload.design,'grad-gala','the booth receives the chosen built-in design, not the admin template record');
  assert.equal(payload.name,'Taylor');
  assert.equal(payload.guest,'approved');
  assert.equal(payload.start,'20:00');assert.equal(payload.end,'00:00');
  assert.equal(link.pathname,'/handoff');assert.equal(link.search,'');
  const shared=JSON.parse(Buffer.from(link.hash.slice(1),'base64url').toString('utf8'));
  assert.equal(shared.id,event.id);
  const serialized=JSON.stringify(shared);
  for(const privateValue of [event.organizationId,event.customerId,event.boothId,event.templateId,
   event.customer.email,event.customer.phone,event.venueAddress,event.internalNotes,
   event.sessions[0].id,event.sessions[0].captures[0].data,event.template.layout.asset])
   assert(!serialized.includes(privateValue),'handoff must omit '+privateValue);
  assert.equal(JSON.stringify(event),before[index],'handoff must not mutate booking, tenant or legacy references');
 }
 assert.notEqual(events[0].id,events[1].id);
 assert.equal(events[0].endTime.toISOString(),'2027-06-11T00:00:00.000Z');
});
test('recorded lifecycle status never hides missing venue details in setup readiness',()=>{
 const event=freeze({customerId:'customer-a',venueName:'Venue',venueAddress:' ',boothId:'booth-a',
  templateId:'legacy-template-a',theme:savedTheme(),...dateTimeFields('2027-06-10','17:00','21:00')});
 const before=JSON.stringify(event);
 for(const status of ['DRAFT','CONFIGURED','LOADED_TO_BOOTH','ACTIVE','COMPLETED','ARCHIVED']){
  const result=readiness({...event,status});
  assert.equal(result.ready,false,status+' is a recorded state, not proof that setup is complete');
  assert.equal(result.next.id,'venue');
 }
 assert.equal(JSON.stringify(event),before);
});
test('saved print design readiness validates its family and never claims physical or customer approval',()=>{
 const check=(eventType,approvedDesign,extra={})=>readiness({eventType,theme:{boothExperience:{approvedDesign}},...extra}).checks.find(item=>item.id==='design');
 assert.equal(check('Graduation','grad-gala').ready,true);
 assert.equal(check('Wedding','grad-gala').ready,false);
 assert.equal(check('Party','not-a-design').ready,false);
 assert.equal(check('Party','champagne').ready,true);
 assert.equal(check('Party',undefined,{templateId:'saved-legacy-template'}).ready,true,'saved legacy references are preserved without claiming the booth installed their artwork');
 for(const item of [check('Party','champagne'),check('Party',undefined,{templateId:'saved-legacy-template'})])assert.equal(item.title,'Saved print design');
});
test('owner schedules reject impossible calendar dates, malformed times and empty durations',()=>{
 for(const fields of [['2027-02-29','17:00','21:00'],['2027-06-10','24:00','21:00'],
  ['2027-06-10','17:60','21:00'],['2027-06-10','17:00','17:00'],['','17:00','21:00']])
  assert.throws(()=>dateTimeFields(...fields));
 const leap=dateTimeFields('2028-02-29','23:30','00:30');
 assert.equal(leap.date.toISOString(),'2028-02-29T12:00:00.000Z');
 assert.equal(leap.startTime.toISOString(),'2028-02-29T23:30:00.000Z');
 assert.equal(leap.endTime.toISOString(),'2028-03-01T00:30:00.000Z');
});
