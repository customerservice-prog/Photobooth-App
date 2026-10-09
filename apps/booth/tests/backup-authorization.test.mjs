import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../app/api/backup/authorize/route.js',import.meta.url),'utf8');
const makeRoute=new Function('NextResponse','cookies','STAFF_COOKIE','validStaffSession','authorizeBackup','database','hasTrustedStaffOrigin','staffSecurityStatus','staffConfigurationError',source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn POST;');
const publicOrigin='https://booth.example.test';
function request(body={eventId:'event-proof'},origin=publicOrigin){
 return new Request('http://booth.railway.internal:3000/api/backup/authorize',{method:'POST',headers:{'Content-Type':'application/json',...(origin===undefined?{}:{Origin:origin})},body:JSON.stringify(body)});
}
function route({authorized=true,configured=true,required=true,database=async()=>{},authorize=()=> 'test-event-scoped-ticket'}={}){
 const calls=[];
 const handler=makeRoute({json:Response.json},()=>({get:name=>({value:name+'-session'})}),'test-staff-cookie',async()=>{calls.push('session');return authorized;},id=>{calls.push('ticket:'+id);return authorize(id);},async()=>{calls.push('database');return database();},r=>r.headers.get('origin')===publicOrigin,()=>({required,configured,missing:configured?[]:['BOOTH_STAFF_SESSION_SECRET']}),()=> 'Staff sign-in setup is incomplete.');
 return {handler,calls};
}

test('backup authorization checks storage before returning a ticket even when no photos exist',async()=>{
 let release;
 const proof=route({database:()=>new Promise(resolve=>{release=resolve;})});
 let returned=false;
 const pending=proof.handler(request()).then(response=>{returned=true;return response;});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(proof.calls,['session','ticket:event-proof','database']);
 assert.equal(returned,false,'database initialization must finish before staff receives a ticket');
 release();
 const response=await pending;
 assert.equal(response.status,200);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await response.json(),{token:'test-event-scoped-ticket'});
});

test('storage failures return a truthful retry message without issuing a ticket or leaking database errors',async()=>{
 const proof=route({database:async()=>{throw new Error('postgresql://private-user:private-password@private-host/private-db');}});
 const response=await proof.handler(request());
 assert.equal(response.status,503);
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 const body=await response.json();
 assert.match(body.error,/storage is unavailable/);
 assert.match(body.error,/Photos remain on this iPad/);
 assert.equal(Object.hasOwn(body,'token'),false);
 assert.doesNotMatch(JSON.stringify(body),/postgresql|private-user|private-password|private-host|test-event-scoped-ticket/);
 assert.deepEqual(proof.calls,['session','ticket:event-proof','database']);
});

test('backup configuration failures do not initialize storage or disclose internal errors',async()=>{
 const proof=route({authorize:()=>{throw new Error('private-backup-secret');}});
 const response=await proof.handler(request());
 assert.equal(response.status,503);
 const body=await response.json();
 assert.match(body.error,/setup is incomplete/);
 assert.doesNotMatch(JSON.stringify(body),/private-backup-secret/);
 assert.deepEqual(proof.calls,['session','ticket:event-proof']);
});

test('failed staff configuration, origin and session checks never initialize backup storage',async()=>{
 for(const options of [{configured:false},{required:false}]){
  const proof=route(options),response=await proof.handler(request());
  assert.equal(response.status,503);
  assert.deepEqual(proof.calls,[]);
 }
 for(const origin of ['https://attacker.example.test','null','']){
  const proof=route(),response=await proof.handler(request({eventId:'event-proof'},origin));
  assert.equal(response.status,403);
  assert.deepEqual(proof.calls,[]);
 }
 const proof=route({authorized:false}),response=await proof.handler(request());
 assert.equal(response.status,401);
 assert.deepEqual(proof.calls,['session']);
});

test('malformed request JSON and event identifiers never mint tickets or initialize storage',async()=>{
 const bodies=[null,{},[],{eventId:123},{eventId:''},{eventId:'no'},{eventId:'event/path'},{eventId:'e'.repeat(91)}];
 for(const body of bodies){
  const proof=route(),response=await proof.handler(request(body));
  assert.equal(response.status,400,JSON.stringify(body));
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(proof.calls,['session']);
 }
 const malformed=new Request('http://booth.railway.internal:3000/api/backup/authorize',{method:'POST',headers:{Origin:publicOrigin,'Content-Type':'application/json'},body:'{"eventId":'});
 const proof=route(),response=await proof.handler(malformed);
 assert.equal(response.status,400);
 assert.deepEqual(proof.calls,['session']);
});
