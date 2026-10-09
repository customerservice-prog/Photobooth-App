import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {Pool} from 'pg';
import {updateStaffEvent,staffEventsResponse} from '../app/lib/staff-events-server.mjs';
import {authorizeBackup} from '../app/lib/backup-auth.mjs';
import {makeStaffSession} from '../app/lib/staff-auth.mjs';
import {createCustomDesign} from '../app/lib/custom-design.mjs';

const enabled=process.env.RUN_LIVE_STAFF_EVENT_DB_TEST==='true';
const connectionString=process.env.DELIVERY_DATABASE_URL||'';
function safeLocalDatabase(){
 let url;try{url=new URL(connectionString);}catch{return false;}
 return ['postgres:','postgresql:'].includes(url.protocol)&&['localhost','127.0.0.1'].includes(url.hostname)&&
  /^\d+$/.test(url.port)&&Number(url.port)>0&&Number(url.port)<=65535;
}
const origin='https://booth.example.test',staffSecret='staff-event-postgres-cookie-secret-123456789',backupSecret='staff-event-postgres-backup-secret-123456789';
const env={BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:'b'.repeat(64),BOOTH_STAFF_SESSION_SECRET:staffSecret,BOOTH_PUBLIC_URL:origin};
const getRequest=(id,token)=>new Request(origin+'/api/staff/events'+(id?'/'+id:''),{headers:{'sec-fetch-site':'same-origin',...(token?{authorization:'Bearer '+token}:{})}});
async function read(db,id){const {rows}=await db.query('SELECT * FROM public."Event" WHERE "id"=$1',[id]);return rows[0];}
const immutableFields=row=>{const {theme,updatedAt,...fields}=row;return fields;};

test('direct staff event flow uses real PostgreSQL transactions and preserves separate bookings',{
 skip:enabled?false:'Set RUN_LIVE_STAFF_EVENT_DB_TEST=true with an isolated local PostgreSQL service to run this proof.'
},async t=>{
 assert(safeLocalDatabase(),'Live staff-event tests require an explicit localhost/127.0.0.1 PostgreSQL port. Production connections are forbidden.');
 const db=new Pool({connectionString,max:4,connectionTimeoutMillis:5000});
 const fixture='staff-proof-'+randomUUID(),ids=[fixture+'-a',fixture+'-b'];
 const priorSecret=process.env.BOOTH_BACKUP_SECRET;process.env.BOOTH_BACKUP_SECRET=backupSecret;
 try{
  await db.query(`CREATE TABLE IF NOT EXISTS public."Event" (
   "id" text PRIMARY KEY,"name" text NOT NULL,"eventType" text,
   "date" timestamp(3) NOT NULL,"startTime" timestamp(3) NOT NULL,"endTime" timestamp(3) NOT NULL,
   "updatedAt" timestamp(3) NOT NULL,"status" text NOT NULL,"theme" jsonb,
   "maxPrints" integer,"printingEnabled" boolean NOT NULL,"qrSharingEnabled" boolean NOT NULL,
   "customerId" text,"boothId" text,"internalNotes" text
  )`);
  const originalTheme={logo:{asset:'private-original-logo'},unknown:{nested:['preserve','everything']},boothExperience:{approvedDesign:'fpr-wedding',featured:'one',pauseSeconds:12,format:'strip',strips:2,photoFit:'fit',primary:'#123456',accent:'#abcdef',nameOnPrint:'Morgan & Alex',classYear:'',legacy:{retain:true}}};
  for(const [index,id] of ids.entries())await db.query(`INSERT INTO public."Event"
   ("id","name","eventType","date","startTime","endTime","updatedAt","status","theme","maxPrints","printingEnabled","qrSharingEnabled","customerId","boothId","internalNotes")
   VALUES ($1,$2,'Wedding',$3,$4,$5,$6,'ACTIVE',$7::jsonb,$8,true,true,$9,$10,$11)`,[
   id,'Staff proof event '+index,new Date('2027-06-05T12:00:00Z'),new Date('2027-06-05T17:00:00Z'),new Date('2027-06-05T21:00:00Z'),
   new Date('2026-10-09T15:00:00Z'),JSON.stringify({...originalTheme,eventReference:id}),index===0?216:108,
   'fixture-customer-'+index,'fixture-booth-'+index,'PRIVATE FIXTURE NOTES '+index
  ]);
  const [beforeA,beforeB]=await Promise.all(ids.map(id=>read(db,id)));
  await t.test('preset update preserves unrelated artwork settings, booking status, allowance and the other event',async()=>{
   const payload=await updateStaffEvent(db,ids[0],{revision:beforeA.updatedAt.toISOString(),design:'fpr-graduation',nameOnPrint:'Jordan',classYear:'2027'});
   assert.equal(payload.id,ids[0]);assert.equal(payload.design,'fpr-graduation');assert.equal(payload.limit,216);assert.equal(payload.name,'Jordan');assert.equal(payload.year,'2027');
   const saved=await read(db,ids[0]);assert.deepEqual(immutableFields(saved),immutableFields(beforeA));
   assert.deepEqual(saved.theme,{...beforeA.theme,boothExperience:{...beforeA.theme.boothExperience,approvedDesign:'fpr-graduation',nameOnPrint:'Jordan',classYear:'2027'}});
   assert.equal(saved.updatedAt.toISOString(),payload.rev);assert(saved.updatedAt>beforeA.updatedAt);assert.deepEqual(await read(db,ids[1]),beforeB);
  });
  await t.test('custom artwork survives a real JSONB round trip and later preset selection retains it',async()=>{
   const current=await read(db,ids[0]),custom=createCustomDesign();custom.heading='A custom celebration';
   const payload=await updateStaffEvent(db,ids[0],{revision:current.updatedAt.toISOString(),design:'custom',customDesign:custom});
   assert.equal(payload.design,'custom');assert.deepEqual(payload.customDesign,custom);
   const saved=await read(db,ids[0]);assert.deepEqual(saved.theme.boothExperience.customDesign,custom);assert.deepEqual(saved.theme.logo,beforeA.theme.logo);assert.deepEqual(immutableFields(saved),immutableFields(beforeA));
   const next=await updateStaffEvent(db,ids[0],{revision:saved.updatedAt.toISOString(),design:'fpr-wedding'});
   assert.equal(next.design,'fpr-wedding');assert.deepEqual((await read(db,ids[0])).theme.boothExperience.customDesign,custom);
  });
  await t.test('concurrent stale revisions admit exactly one update and roll back the other',async()=>{
   const current=await read(db,ids[0]),revision=current.updatedAt.toISOString();
   const results=await Promise.allSettled(['fpr-birthday','fpr-corporate'].map(design=>updateStaffEvent(db,ids[0],{revision,design})));
   const successful=results.filter(result=>result.status==='fulfilled'),failed=results.filter(result=>result.status==='rejected');
   assert.equal(successful.length,1);assert.equal(failed.length,1);assert.equal(failed[0].reason.status,409);
   const saved=await read(db,ids[0]);assert.equal(saved.theme.boothExperience.approvedDesign,successful[0].value.design);assert.equal(saved.updatedAt.toISOString(),successful[0].value.rev);
   assert.deepEqual(immutableFields(saved),immutableFields(beforeA));assert.deepEqual(await read(db,ids[1]),beforeB);
   await assert.rejects(updateStaffEvent(db,ids[0],{revision,design:'fpr-quince'}),error=>error.status===409);
   assert.deepEqual(await read(db,ids[0]),saved,'a stale retry must not change the successful customer design');
  });
  await t.test('event token reads only its own real booking without staff cookies, renewal or expired access',async()=>{
   const token=authorizeBackup(ids[0]),options={env,getDatabase:async()=>db,eventId:ids[0]};
   const response=await staffEventsResponse(getRequest(ids[0],token),options),body=await response.json();
   assert.equal(response.status,200);assert.equal(body.payload.id,ids[0]);assert.equal(Object.hasOwn(body,'token'),false);assert.equal(body.payload.sync,undefined);
   assert.doesNotMatch(JSON.stringify(body),/PRIVATE FIXTURE NOTES|fixture-customer|fixture-booth|private-original-logo/);
   const wrong=await staffEventsResponse(getRequest(ids[1],token),{...options,eventId:ids[1]});assert.equal(wrong.status,401);
   const encoded=Buffer.from(JSON.stringify({v:1,eventId:ids[0],expires:Date.now()-1000,nonce:'expired-fixture'})).toString('base64url');
   const expired=encoded+'.'+createHmac('sha256',backupSecret).update(encoded).digest('base64url');
   assert.equal((await staffEventsResponse(getRequest(ids[0],expired),options)).status,401);
   const staffCookie=await makeStaffSession(staffSecret),staff=await staffEventsResponse(getRequest(ids[1]),{...options,eventId:ids[1],staffCookie});
   assert.equal(staff.status,200);assert.equal(typeof (await staff.json()).token,'string');
   assert.deepEqual(await read(db,ids[1]),beforeB,'authenticated reads must never modify the second event');
  });
  await t.test('archiving one event locks new starts while preserving every other event',async()=>{
   await db.query('UPDATE public."Event" SET "status"=$2 WHERE "id"=$1',[ids[1],'ARCHIVED']);
   const archived=await read(db,ids[1]);
   await assert.rejects(updateStaffEvent(db,ids[1],{revision:archived.updatedAt.toISOString(),design:'fpr-quince'}),error=>error.status===409);
   const response=await staffEventsResponse(getRequest(ids[1],authorizeBackup(ids[1])),{env,eventId:ids[1],getDatabase:async()=>db});assert.equal(response.status,409);
   const listed=await staffEventsResponse(getRequest(),{env,staffCookie:await makeStaffSession(staffSecret),getDatabase:async()=>db});
   const body=await listed.json();assert.equal(listed.status,200);assert(body.events.some(item=>item.id===ids[0]));assert(!body.events.some(item=>item.id===ids[1]));
   assert.deepEqual(await read(db,ids[1]),archived);
  });
 }finally{
  // Delete only this test's random fixtures. Never drop/truncate a shared table.
  await db.query('DELETE FROM public."Event" WHERE "id"=ANY($1::text[])',[ids]).catch(()=>{});
  await db.end();if(priorSecret===undefined)delete process.env.BOOTH_BACKUP_SECRET;else process.env.BOOTH_BACKUP_SECRET=priorSecret;
 }
});
