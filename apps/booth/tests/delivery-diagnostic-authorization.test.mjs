import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStaffSession} from '../app/lib/staff-auth.mjs';
import {authorizeStaffDiagnosticDelivery,deliverySessionCookie,session} from '../app/lib/delivery.mjs';

const origin='https://booth.example.test';
const env={BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:'a'.repeat(64),BOOTH_STAFF_SESSION_SECRET:'diagnostic-staff-session-secret-12345678',BOOTH_PUBLIC_URL:origin,DELIVERY_DATABASE_URL:'postgresql://invalid/test-no-db',BOOTH_SESSION_SECRET:'diagnostic-delivery-session-secret-12345678',BOOTH_PAIRING_CODE:'diagnostic-pairing-code-123'};
const request=(method='POST',headers={})=>new Request('http://railway-internal:3000/api/delivery/session/staff',{method,headers:{origin,...headers}});
const enable=async(req=request(),settings=env)=>authorizeStaffDiagnosticDelivery(req,{env:settings,staffCookie:await makeStaffSession(settings.BOOTH_STAFF_SESSION_SECRET)});
const withCookie=cookie=>request('POST',{cookie:cookie.split(';')[0]});

test('explicit staff authorization works without an event, database access or provider credentials',async()=>{
 const response=await enable();
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{paired:true,hours:12});
 const cookie=response.headers.get('set-cookie');
 for(const attribute of ['__Host-booth-delivery=','HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=43200'])assert(cookie.includes(attribute));
 const ticket=session(withCookie(cookie),env);
 assert(ticket);
 assert(ticket.expires>Date.now()+11*3600000&&ticket.expires<=Date.now()+12*3600000);
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert(!cookie.includes(env.BOOTH_SESSION_SECRET));
});

test('reads, missing or foreign origin, and forwarded-host spoofing cannot authorize staff delivery',async()=>{
 await assert.rejects(()=>enable(request('GET')),error=>error.status===405);
 for(const supplied of ['', 'null','https://other.example.test']){
  await assert.rejects(()=>enable(request('POST',{origin:supplied,'x-forwarded-host':'booth.example.test'})),error=>error.status===403);
 }
 const missing=new Request(origin+'/api/delivery/session/staff',{method:'POST'});
 await assert.rejects(()=>enable(missing),error=>error.status===403);
});

test('absent, forged, expired or differently signed staff sessions cannot enable sending',async()=>{
 const expired=await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET,Date.now()-20*60000);
 const other=await makeStaffSession('different-staff-session-secret-12345678');
 for(const staffCookie of [undefined,'forged',expired,other]){
  await assert.rejects(()=>authorizeStaffDiagnosticDelivery(request(),{env,staffCookie}),error=>error.status===401);
 }
});

test('disabled or incomplete staff security and delivery dependencies fail closed',async()=>{
 const ticket=await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET);
 for(const field of ['BOOTH_SECURITY_ENFORCED','BOOTH_STAFF_PIN_SHA256','BOOTH_STAFF_SESSION_SECRET','BOOTH_PUBLIC_URL','DELIVERY_DATABASE_URL','BOOTH_SESSION_SECRET','BOOTH_PAIRING_CODE']){
  await assert.rejects(()=>authorizeStaffDiagnosticDelivery(request(),{env:{...env,[field]:''},staffCookie:ticket}),error=>error.status===503);
 }
});

test('staff enable preserves existing device identity, quotas and receipt ownership',async()=>{
 const cookie=deliverySessionCookie(request(),env);
 const response=await enable(withCookie(cookie));
 assert.equal(session(withCookie(response.headers.get('set-cookie')),env).device,session(withCookie(cookie),env).device);
});

test('forged prior device identity is not trusted',async()=>{
 const cookie=deliverySessionCookie(request(),env);
 const response=await enable(withCookie(cookie.replace(/=[^;]+/,'=forged.signature')));
 assert.notEqual(session(withCookie(response.headers.get('set-cookie')),env).device,session(withCookie(cookie),env).device);
});
