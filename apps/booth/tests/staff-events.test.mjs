import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {staffEventsResponse,staffEventPayload,updateStaffEvent,STAFF_EVENT_BODY_LIMIT} from '../app/lib/staff-events-server.mjs';
import {makeStaffSession} from '../app/lib/staff-auth.mjs';
import {authorizeBackup,verifyBackupTicket} from '../app/lib/backup-auth.mjs';
import {createCustomDesign} from '../app/lib/custom-design.mjs';

const origin='https://booth.example.test',secret='staff-events-test-session-secret-12345678';
const env={BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:'a'.repeat(64),BOOTH_STAFF_SESSION_SECRET:secret,BOOTH_PUBLIC_URL:origin};
const previous=process.env.BOOTH_BACKUP_SECRET;
process.env.BOOTH_BACKUP_SECRET='staff-events-test-private-backup-secret-12345678';
test.after(()=>{if(previous===undefined)delete process.env.BOOTH_BACKUP_SECRET;else process.env.BOOTH_BACKUP_SECRET=previous;});
const event=()=>({id:'event-a',name:'Morgan & Alex',eventType:'Wedding',date:new Date('2027-06-05T12:00:00Z'),startTime:new Date('2027-06-05T17:00:00Z'),endTime:new Date('2027-06-05T21:00:00Z'),updatedAt:new Date('2026-10-09T15:00:00Z'),status:'ACTIVE',maxPrints:216,printingEnabled:true,qrSharingEnabled:true,
 organizationId:'private-org',customerId:'private-customer',venueAddress:'PRIVATE ADDRESS',internalNotes:'PRIVATE NOTES',customer:{email:'private@example.invalid'},
 theme:{legacyLogo:{src:'old-logo'},unknown:{preserve:true},boothExperience:{approvedDesign:'fpr-wedding',nameOnPrint:'Morgan & Alex',classYear:'',featured:'one',pauseSeconds:12,photoFit:'fit',format:'strip',strips:2,paletteId:'rose',primary:'#123456',accent:'#abcdef',legacySetting:'KEEP'}}});
function pool(saved=event()){
 const calls=[];let connects=0,released=0,committed=null;
 const query=async(sql,params)=>{
  calls.push({sql,params});
  if(sql.startsWith('SELECT')&&sql.includes(' AS "design"'))return {rows:[{...saved,design:saved.theme.boothExperience.approvedDesign}]};
  if(sql.startsWith('SELECT'))return {rows:saved?[structuredClone(saved)]:[]};
  if(sql.startsWith('UPDATE')){committed={...structuredClone(saved),theme:JSON.parse(params[1]),updatedAt:new Date('2026-10-09T15:00:00.001Z')};return {rows:[committed]};}
  return {rows:[]};
 };
 return {query,calls,get connects(){return connects;},get released(){return released;},get committed(){return committed;},connect:async()=>{connects++;return {query,release:()=>released++};}};
}
function request(method='GET',{id,body,headers={}}={}){
 return new Request(origin+'/api/staff/events'+(id?'/'+id:''),{method,headers:{...(method==='GET'?{'sec-fetch-site':'same-origin'}:{origin,'content-type':'application/json'}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
}
async function options(db,extra={}){return {env,getDatabase:async()=>db,staffCookie:await makeStaffSession(secret),...extra};}
async function result(req,opts){const response=await staffEventsResponse(req,opts);return {status:response.status,body:await response.json(),headers:response.headers};}
const change=(extra={})=>({revision:event().updatedAt.toISOString(),design:'fpr-birthday',...extra});

test('signed staff sees only bounded PII-minimal event metadata, without changing the booking',async()=>{
 const db=pool(),actual=await result(request(),await options(db));
 assert.equal(actual.status,200);assert.match(actual.headers.get('cache-control'),/no-store/);
 assert.deepEqual(actual.body.events,[{id:'event-a',title:'Morgan & Alex',date:'2027-06-05',eventType:'Wedding',revision:'2026-10-09T15:00:00.000Z',design:'fpr-wedding'}]);
 assert.match(db.calls[0].sql,/NOT IN \('COMPLETED','ARCHIVED'\)/);assert.match(db.calls[0].sql,/LIMIT 200/);
 assert.doesNotMatch(db.calls[0].sql,/customer|venue|notes/i);assert.equal(db.connects,0);assert.equal(db.committed,null);
});
test('missing, forged and expired staff cookies cannot list events; backup token cannot list either',async()=>{
 for(const staffCookie of [undefined,'forged',await makeStaffSession(secret,Date.now()-20*60000)]){
  let reads=0;const actual=await result(request('GET',{headers:{authorization:'Bearer '+authorizeBackup('event-a')}}),{env,staffCookie,getDatabase:async()=>{reads++;throw Error('must not read');}});
  assert.equal(actual.status,401);assert.equal(reads,0);
 }
});
test('cross-origin and untrusted GET requests fail before database access',async()=>{
 for(const headers of [{origin:'https://attacker.example.test'},{origin:'null'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':'none'},{'sec-fetch-site':''}]){
  const db=pool(),actual=await result(request('GET',{headers}),await options(db));assert.equal(actual.status,403);assert.equal(db.calls.length,0);
 }
 const db=pool();assert.equal((await result(request('GET',{headers:{origin}}),await options(db))).status,200);
});
test('staff event read returns approved payload and matching 30-day backup ticket',async()=>{
 const db=pool(),actual=await result(request('GET',{id:'event-a'}),await options(db,{eventId:'event-a'}));
 assert.equal(actual.status,200);assert.equal(verifyBackupTicket(actual.body.token,'event-a'),true);assert.equal(verifyBackupTicket(actual.body.token,'event-b'),false);
 assert.equal(actual.body.payload.id,'event-a');assert.equal(actual.body.payload.guest,'approved');assert.equal(actual.body.payload.sync,undefined);
 assert.equal(actual.body.payload.limit,216);assert.equal(actual.body.payload.f,'one');assert.equal(actual.body.payload.p,12);assert.equal(actual.body.payload.fit,'fit');
 assert.equal(actual.body.payload.a,'#123456');assert.equal(actual.body.payload.s,2);assert.equal(db.calls[0].params[0],'event-a');
 for(const marker of ['private-org','private-customer','PRIVATE ADDRESS','PRIVATE NOTES','private@example.invalid'])assert(!JSON.stringify(actual.body).includes(marker));
});
test('matching backup token reads only its own event and cannot renew tickets or mutate a design',async()=>{
 const token=authorizeBackup('event-a'),headers={authorization:'Bearer '+token};
 const db=pool(),actual=await result(request('GET',{id:'event-a',headers}),await options(db,{eventId:'event-a',staffCookie:undefined}));
 assert.equal(actual.status,200);assert.equal(Object.hasOwn(actual.body,'token'),false);assert.equal(actual.body.payload.id,'event-a');
 const wrong=pool(),wrongResult=await result(request('GET',{id:'event-b',headers}),await options(wrong,{eventId:'event-b',staffCookie:undefined}));
 assert.equal(wrongResult.status,401);assert.equal(wrong.calls.length,0);
 const mutation=pool(),mutationResult=await result(request('POST',{id:'event-a',headers,body:change()}),await options(mutation,{eventId:'event-a',staffCookie:undefined}));
 assert.equal(mutationResult.status,401);assert.equal(mutation.calls.length,0);
});
test('unknown and invalid event IDs cannot return a different booking',async()=>{
 const db=pool(null),missing=await result(request('GET',{id:'event-a'}),await options(db,{eventId:'event-a'}));assert.equal(missing.status,404);
 for(const id of ['x',"event-a' OR TRUE --",'event/a']){
  const other=pool(),actual=await result(request('GET'),await options(other,{eventId:id}));assert.equal(actual.status,400);assert.equal(other.calls.length,0);
 }
});
test('completed and archived bookings cannot be started or edited',async()=>{
 for(const status of ['COMPLETED','ARCHIVED']){
  const saved={...event(),status},read=pool(saved),actual=await result(request('GET',{id:'event-a'}),await options(read,{eventId:'event-a'}));assert.equal(actual.status,409);
  const db=pool(saved),updated=await result(request('POST',{id:'event-a',body:change()}),await options(db,{eventId:'event-a'}));assert.equal(updated.status,409);assert.equal(db.committed,null);assert.equal(db.released,1);assert(db.calls.some(call=>call.sql==='ROLLBACK'));
 }
});
test('staff changes one design while preserving other theme fields, status, allowance and photo references',async()=>{
 const original=event(),db=pool(original),actual=await result(request('POST',{id:'event-a',body:change({nameOnPrint:'Jordan',classYear:'2027'})}),await options(db,{eventId:'event-a'}));
 assert.equal(actual.status,200);assert.equal(actual.body.payload.design,'fpr-birthday');assert.equal(actual.body.payload.name,'Jordan');assert.equal(actual.body.payload.rev,'2026-10-09T15:00:00.001Z');
 assert.equal(verifyBackupTicket(actual.body.token,'event-a'),true);
 assert.deepEqual(db.committed.theme,{...original.theme,boothExperience:{...original.theme.boothExperience,approvedDesign:'fpr-birthday',nameOnPrint:'Jordan',classYear:'2027'}});
 for(const field of ['status','maxPrints','printingEnabled','customerId','organizationId','venueAddress','internalNotes'])assert.equal(db.committed[field],original[field]);
 const write=db.calls.find(call=>call.sql.startsWith('UPDATE'));assert.match(write.sql,/SET "theme"=\$2::jsonb,"updatedAt"=/);assert.match(write.sql,/WHERE "id"=\$1 AND "updatedAt"=\$3/);assert.deepEqual(write.params,[original.id,JSON.stringify(db.committed.theme),original.updatedAt]);
 assert.doesNotMatch(write.sql.split(' RETURNING ')[0],/DELETE|INSERT|sessions|images|maxPrints|status"=/i);assert(db.calls.some(call=>call.sql==='COMMIT'));assert.equal(db.released,1);
});
test('stale revision rolls back without changing the event',async()=>{
 const db=pool(),actual=await result(request('POST',{id:'event-a',body:change({revision:'2026-10-08T00:00:00.000Z'})}),await options(db,{eventId:'event-a'}));
 assert.equal(actual.status,409);assert.match(actual.body.error,/another window/);assert.equal(db.committed,null);assert.equal(db.released,1);
});
test('five approved presets and valid custom layout can be saved; legacy choices cannot be newly selected',async()=>{
 for(const design of ['fpr-wedding','fpr-graduation','fpr-birthday','fpr-quince','fpr-corporate'])assert.equal((await updateStaffEvent(pool(),'event-a',change({design}))).design,design);
 const custom=createCustomDesign(),db=pool(),payload=await updateStaffEvent(db,'event-a',change({design:'custom',customDesign:custom}));assert.deepEqual(payload.customDesign,custom);assert.equal(db.committed.theme.legacyLogo.src,'old-logo');
 for(const design of ['ivory','grad-gala','champagne','unknown']){const other=pool();await assert.rejects(updateStaffEvent(other,'event-a',change({design})));assert.equal(other.connects,0);}
});
test('invalid uploaded custom artwork, overlapping windows and unknown request keys never write',async()=>{
 const overlap=createCustomDesign();overlap.layouts.four.rects[1]={...overlap.layouts.four.rects[0]};
 for(const body of [change({design:'custom',customDesign:createCustomDesign('upload')}),change({design:'custom',customDesign:overlap}),change({maxPrints:0}),change({nameOnPrint:'<bad>'}),change({classYear:'20xx'})]){
  const db=pool(),actual=await result(request('POST',{id:'event-a',body}),await options(db,{eventId:'event-a'}));assert.equal(actual.status,400);assert.equal(db.committed,null);assert.equal(db.connects,0);
 }
 const db=pool(),missing=await result(request('POST',{id:'event-a',body:change({design:'custom'})}),await options(db,{eventId:'event-a'}));assert.equal(missing.status,400);assert.equal(db.committed,null);
});
test('existing complete custom artwork may be reused without resubmitting its bytes',async()=>{
 const saved=event(),custom=createCustomDesign();saved.theme.boothExperience.customDesign=custom;
 const db=pool(saved),payload=await updateStaffEvent(db,'event-a',change({design:'custom'}));assert.deepEqual(payload.customDesign,custom);
});
test('POST rejects foreign origins, malformed JSON, oversized streams and wrong content type',async()=>{
 const cases=[
  {body:change(),headers:{origin:'https://attacker.example.test'},status:403},
  {body:'{broken',status:400},
  {body:' '.repeat(STAFF_EVENT_BODY_LIMIT+1),status:413},
  {body:change(),headers:{'content-length':String(STAFF_EVENT_BODY_LIMIT+1)},status:413},
  {body:change(),headers:{'content-type':'text/plain'},status:415}
 ];
 for(const item of cases){const db=pool(),actual=await result(request('POST',{id:'event-a',...item}),await options(db,{eventId:'event-a'}));assert.equal(actual.status,item.status);assert.equal(db.connects,0);assert.equal(db.committed,null);}
});
test('payload keeps legacy saved designs readable, custom validation and zero print allowance truthful',()=>{
 const saved=event();saved.theme.boothExperience.approvedDesign='ivory';saved.maxPrints=0;const actual=staffEventPayload(saved);assert.equal(actual.design,'ivory');assert.equal(actual.on,false);assert.equal(actual.limit,0);
 saved.theme.boothExperience.approvedDesign='custom';assert.throws(()=>staffEventPayload(saved));
});
test('database outage returns a retryable response without private exception detail',async()=>{
 const actual=await result(request(),await options(null,{getDatabase:async()=>{throw Error('SECRET DATABASE PASSWORD');}}));assert.equal(actual.status,503);assert.doesNotMatch(actual.body.error,/SECRET|PASSWORD/);
});
test('missing backup security fails before committing a selected event design',async()=>{
 const db=pool(),actual=await result(request('POST',{id:'event-a',body:change()}),await options(db,{eventId:'event-a',makeBackup:()=>{throw Error('Backup secret missing');}}));
 assert.equal(actual.status,503);assert.equal(db.connects,0);assert.equal(db.committed,null);
});
test('Next routes pass only the signed staff cookie and path event ID to the shared authorization handler',async()=>{
 const calls=[],handler=async(...args)=>{calls.push(args);return new Response('ok');};
 for(const [file,path,id] of [['../app/api/staff/events/route.js','/api/staff/events',undefined],['../app/api/staff/events/[id]/route.js','/api/staff/events/event-a','event-a']]){
  const source=await readFile(new URL(file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/admin\//);assert.match(source,/dynamic='force-dynamic'/);
  const routes=new Function('cookies','STAFF_COOKIE','staffEventsResponse',source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {GET,'+(id?'POST':'POST:undefined')+'};')(()=>({get:key=>{assert.equal(key,'staff-cookie');return {value:'signed-cookie'};}}),'staff-cookie',handler);
  for(const method of id?['GET','POST']:['GET']){
   const req=new Request(origin+path,{method});await routes[method](req,{params:{id}});assert.equal(calls.at(-1)[0],req);assert.deepEqual(calls.at(-1)[1],{...(id?{eventId:id}:{}),staffCookie:'signed-cookie'});
  }
 }
});
