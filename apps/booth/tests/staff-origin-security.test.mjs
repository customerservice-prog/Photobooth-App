import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {publicBoothOrigin,hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError} from '../app/lib/staff-security.mjs';
import {matchesConfiguredStaffPin} from '../app/lib/staff-pin-server.mjs';
import {STAFF_COOKIE,makeStaffSession,validStaffSession} from '../app/lib/staff-auth.mjs';
import {validEventBackupProof,verifyEventBackupProof} from '../app/lib/backup-event-proof.mjs';
const publicOrigin='https://booth.example.test',internalUrl='http://booth.railway.internal:3000/api/staff/unlock';
const fakePin='4826',fakeHash=createHash('sha256').update(fakePin).digest('hex');
const configured={NODE_ENV:'production',BOOTH_PUBLIC_URL:publicOrigin,BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:fakeHash,BOOTH_STAFF_SESSION_SECRET:'test-only-session-secret-at-least-32-characters'};
const request=(origin,url=internalUrl,headers={},body={pin:fakePin})=>new Request(url,{method:'POST',headers:{'Content-Type':'application/json',...(origin===undefined?{}:{Origin:origin}),...headers},body:JSON.stringify(body)});
const nextResponse={json(body,options={}){const response=Response.json(body,options);response.testCookies=[];response.cookies={set:(...args)=>response.testCookies.push(args)};return response;}};

test('staff CSRF accepts the configured public booth behind Railway internal URLs',()=>{
 assert.equal(publicBoothOrigin(configured,internalUrl),publicOrigin);
 assert.equal(hasTrustedStaffOrigin(request(publicOrigin),configured),true);
 const railway={NODE_ENV:'production',RAILWAY_PUBLIC_DOMAIN:'booth.example.test'};
 assert.equal(hasTrustedStaffOrigin(request(publicOrigin),railway),true);
 for(const origin of [undefined,'null','https://attacker.example.test','http://booth.example.test','http://booth.railway.internal:3000',publicOrigin+'/'])assert.equal(hasTrustedStaffOrigin(request(origin),configured),false,origin||'missing');
 assert.equal(hasTrustedStaffOrigin(request('https://attacker.example.test',internalUrl,{'x-forwarded-host':'attacker.example.test','x-forwarded-proto':'https'}),configured),false);
});
test('configured origins reject alternate hosts and invalid URLs instead of trusting proxy headers',()=>{
 for(const origin of ['http://booth.example.test','https://staff:password@booth.example.test','https://booth.example.test/path','https://booth.example.test?next=other','https://booth.example.test#fragment','invalid'])assert.equal(publicBoothOrigin({...configured,BOOTH_PUBLIC_URL:origin,RAILWAY_PUBLIC_DOMAIN:'booth.example.test'},internalUrl),'',origin);
 for(const domain of ['staff:password@booth.example.test','booth.example.test/path','https://booth.example.test','booth.example.test?next=other'])assert.equal(publicBoothOrigin({RAILWAY_PUBLIC_DOMAIN:domain},internalUrl),'',domain);
 assert.equal(publicBoothOrigin({NODE_ENV:'production',RAILWAY_SERVICE_ID:'known-deployment'},internalUrl),'');
});
test('only direct local builds retain request URL origin fallback',()=>{
 const local={NODE_ENV:'production'},url='http://127.0.0.1:3000/api/staff/unlock';
 assert.equal(publicBoothOrigin(local,url),'http://127.0.0.1:3000');
 assert.equal(hasTrustedStaffOrigin(request('http://127.0.0.1:3000',url),local),true);
 assert.deepEqual(staffSecurityStatus(local,url),{required:false,configured:true,missing:[]});
});
test('deployed readiness fails closed for invalid PIN hash, short session secret or disabled enforcement',()=>{
 assert.deepEqual(staffSecurityStatus(configured,internalUrl),{required:true,configured:true,missing:[]});
 for(const [key,value] of [['BOOTH_STAFF_PIN_SHA256','invalid'],['BOOTH_STAFF_SESSION_SECRET','short'],['BOOTH_SECURITY_ENFORCED','false'],['BOOTH_PUBLIC_URL','invalid']]){
  const status=staffSecurityStatus({...configured,[key]:value},internalUrl);
  assert.equal(status.required,true);assert.equal(status.configured,false);assert(status.missing.includes(key));
  assert.match(staffConfigurationError(status),/setup is incomplete/);
  assert(!staffConfigurationError(status).includes('Incorrect'));
 }
});

async function unlockRoute(){
 const source=await readFile(new URL('../app/api/staff/unlock/route.js',import.meta.url),'utf8');
 return new Function('NextResponse','matchesConfiguredStaffPin','STAFF_COOKIE','makeStaffSession','hasTrustedStaffOrigin','staffSecurityStatus','staffConfigurationError',source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {GET,POST};')(nextResponse,matchesConfiguredStaffPin,'test-staff-cookie',async()=>'test-signed-session',hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError);
}
async function withEnvironment(env,job){
 const keys=['NODE_ENV','BOOTH_PUBLIC_URL','RAILWAY_PUBLIC_DOMAIN','RAILWAY_SERVICE_ID','RAILWAY_ENVIRONMENT_ID','RAILWAY_PROJECT_ID','BOOTH_SECURITY_ENFORCED','BOOTH_STAFF_PIN_SHA256','BOOTH_STAFF_SESSION_SECRET'];
 const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
 try{for(const key of keys){if(env[key]===undefined)delete process.env[key];else process.env[key]=env[key];}return await job();}
 finally{for(const key of keys){if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];}}
}
test('unlock route issues session only for valid public-origin PIN and reports readiness configuration errors',async()=>{
 const route=await unlockRoute();
 await withEnvironment(configured,async()=>{
  const readiness=await route.GET(new Request(internalUrl));
  assert.equal(readiness.status,200);assert.equal((await readiness.json()).required,true);
  const result=await route.POST(request(publicOrigin));
  assert.equal(result.status,200);assert.equal(result.testCookies.length,1);assert.equal(result.testCookies[0][2].httpOnly,true);
  for(const origin of [undefined,'null','https://attacker.example.test']){const blocked=await route.POST(request(origin));assert.equal(blocked.status,403);assert.equal(blocked.testCookies.length,0);}
 });
 for(const [key,value] of [['BOOTH_STAFF_PIN_SHA256','invalid'],['BOOTH_STAFF_SESSION_SECRET','short'],['BOOTH_SECURITY_ENFORCED','false']])await withEnvironment({...configured,[key]:value},async()=>{
  const readiness=await route.GET(new Request(internalUrl)),body=await readiness.json();
  assert.equal(readiness.status,503);assert.equal(body.required,true);assert.equal(body.configured,false);assert(body.missing.includes(key));
  const denied=await route.POST(request(publicOrigin));
  assert.equal(denied.status,503);assert.equal(denied.testCookies.length,0);assert.match((await denied.json()).error,/setup is incomplete/);
 });
});
test('staff lock and backup authorization preserve origin and session checks behind the proxy',async()=>{
 const lockSource=await readFile(new URL('../app/api/staff/lock/route.js',import.meta.url),'utf8');
 const lock=new Function('NextResponse','STAFF_COOKIE','hasTrustedStaffOrigin',lockSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn POST;')(nextResponse,'test-staff-cookie',hasTrustedStaffOrigin);
 const backupSource=await readFile(new URL('../app/api/backup/authorize/route.js',import.meta.url),'utf8');
 let authorized=true;
 const backup=new Function('NextResponse','cookies','STAFF_COOKIE','validStaffSession','authorizeBackup','database','hasTrustedStaffOrigin','staffSecurityStatus','staffConfigurationError','validEventBackupProof','verifyEventBackupProof',backupSource.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn POST;')(nextResponse,()=>({get:()=>({value:'test-cookie'})}),'test-staff-cookie',async()=>authorized,id=>{assert.equal(id,'test-event');return 'test-backup-ticket';},async()=>{},hasTrustedStaffOrigin,staffSecurityStatus,staffConfigurationError,validEventBackupProof,verifyEventBackupProof);
 await withEnvironment(configured,async()=>{
  const result=await lock(request(publicOrigin));assert.equal(result.status,200);assert.equal(result.testCookies[0][2].maxAge,0);
  for(const origin of [undefined,'null','https://attacker.example.test'])assert.equal((await lock(request(origin))).status,403);
  const backupRequest=origin=>request(origin,internalUrl,{}, {eventId:'test-event'});
  assert.equal((await backup(backupRequest(publicOrigin))).status,200);
  authorized=false;assert.equal((await backup(backupRequest(publicOrigin))).status,401);
  for(const origin of [undefined,'null','https://attacker.example.test'])assert.equal((await backup(backupRequest(origin))).status,403);
 });
});
test('protected staff middleware redirects to the public booth and fails closed without its address',async()=>{
 const source=await readFile(new URL('../middleware.js',import.meta.url),'utf8');
 const adapter={...nextResponse,next:()=>new Response(null,{headers:{'x-test-next':'yes'}}),redirect:url=>new Response(null,{status:307,headers:{Location:String(url)}})};
 const {middleware,config}=new Function('NextResponse','STAFF_COOKIE','validStaffSession','publicBoothOrigin',source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn {middleware,config};')(adapter,STAFF_COOKIE,validStaffSession,publicBoothOrigin);
 const staffRequest=session=>({url:'http://booth.railway.internal:3000/setup?booth_event=event-2026',headers:new Headers({'x-forwarded-host':'attacker.example.test','x-forwarded-proto':'https'}),cookies:{get:name=>name===STAFF_COOKIE&&session?{value:session}:undefined}});
 await withEnvironment(configured,async()=>{
  const redirect=await middleware(staffRequest());
  assert.equal(redirect.status,307);assert.equal(redirect.headers.get('location'),publicOrigin+'/?staff=required');
  const authorized=await middleware(staffRequest(await makeStaffSession(configured.BOOTH_STAFF_SESSION_SECRET)));
  assert.equal(authorized.headers.get('x-test-next'),'yes');
 });
 await withEnvironment({...configured,BOOTH_PUBLIC_URL:undefined,RAILWAY_PUBLIC_DOMAIN:'booth.example.test'},async()=>{
  assert.equal((await middleware(staffRequest())).headers.get('location'),publicOrigin+'/?staff=required');
 });
 for(const env of [{...configured,BOOTH_PUBLIC_URL:'invalid'},{...configured,BOOTH_PUBLIC_URL:undefined,RAILWAY_SERVICE_ID:'known-deployment'}])await withEnvironment(env,async()=>{
  const denied=await middleware(staffRequest());assert.equal(denied.status,503);assert.equal(denied.headers.has('location'),false);assert.match((await denied.json()).error,/configured public booth address/);
 });
 await withEnvironment({NODE_ENV:'production'},async()=>assert.equal((await middleware(staffRequest())).headers.get('x-test-next'),'yes'));
 assert.deepEqual(config.matcher,['/setup/:path*','/event-prep/:path*','/print-test/:path*','/delivery-check/:path*','/test/:path*','/designs/:path*','/oct10-demo/:path*']);
});
