import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStaffSession} from '../app/lib/staff-auth.mjs';
import {configuration,configurationResponse,deliveryReadiness,deliverySessionCookie,publicConfiguration,sendProvider} from '../app/lib/delivery.mjs';

const origin='https://booth.example.test';
const env={BOOTH_PUBLIC_URL:origin,DELIVERY_DATABASE_URL:'postgresql://local/delivery-readiness-test',BOOTH_SESSION_SECRET:'test-only-delivery-session-secret-123456',BOOTH_PAIRING_CODE:'test-only-delivery-pairing-code-123',BOOTH_STAFF_SESSION_SECRET:'test-only-staff-session-secret-123456',BOOTH_EMAIL_ENABLED:'true',BOOTH_SMS_ENABLED:'true',BOOTH_EMAIL_FROM:'booth@example.test',RESEND_API_KEY:'re_test_only_sender_key',TWILIO_ACCOUNT_SID:'AC'+'a'.repeat(32),TWILIO_AUTH_TOKEN:'b'.repeat(32),TWILIO_MESSAGING_SERVICE_SID:'MG'+'c'.repeat(32),TWILIO_FROM_NUMBER:'+13155550123'};
const request=(staff=false,headers={})=>new Request(origin+'/api/delivery/config'+(staff?'?staff=1':''),{headers:{'sec-fetch-site':'same-origin',...headers}});

test('public delivery configuration exposes availability without infrastructure setting names or values',async()=>{
 for(const configured of [env,{}]){
  const response=await configurationResponse(request(),{env:configured}),body=await response.json();
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(body,{...publicConfiguration(configured),paired:false});
  const text=JSON.stringify(body);
  for(const name of [...Object.keys(env),'missing','providerMissing','dependencies','senderMode'])assert(!text.includes(name),name);
 }
});

test('a paired guest receives availability but never staff setup diagnostics',async()=>{
 const cookie=deliverySessionCookie(request(),env).split(';')[0];
 const response=await configurationResponse(request(false,{cookie}),{env}),body=await response.json();
 assert.equal(body.paired,true);assert.equal(body.email.configured,true);assert.equal(body.sms.configured,true);
 assert.equal(body.dependencies,undefined);assert.equal(body.email.missing,undefined);
 const denied=await configurationResponse(request(true,{cookie}),{env});
 assert.equal(denied.status,401,'delivery authorization is not staff authorization');
});

test('staff setup diagnostics require an unexpired signature from the configured staff secret',async()=>{
 const cookies=[undefined,'forged',await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET,Date.now()-20*60000),await makeStaffSession('wrong-staff-session-secret-123456789')];
 for(const staffCookie of cookies){
  const response=await configurationResponse(request(true),{env,staffCookie});
  assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.deepEqual(Object.keys(body),['error']);assert(!JSON.stringify(body).includes('TWILIO'));
 }
});

test('authenticated staff diagnostics reject cross-site requests and missing browser origin evidence',async()=>{
 const staffCookie=await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET);
 for(const headers of [{origin:'https://attacker.example.test'},{origin:'null'},{'sec-fetch-site':'cross-site'},{'sec-fetch-site':''}]){
  const response=await configurationResponse(request(true,headers),{env,staffCookie});
  assert.equal(response.status,403);assert.deepEqual(Object.keys(await response.json()),['error']);
 }
 const response=await configurationResponse(request(true,{origin}),{env,staffCookie});
 assert.equal(response.status,200);
});

test('staff diagnostics honor the Railway public origin fallback and reject empty origins',async()=>{
 const staffCookie=await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET);
 const fallback={...env,BOOTH_PUBLIC_URL:undefined,RAILWAY_PUBLIC_DOMAIN:'booth.example.test'};
 const response=await configurationResponse(request(true,{origin}),{env:fallback,staffCookie});
 assert.equal(response.status,200);
 assert((await response.json()).dependencies.missing.includes('BOOTH_PUBLIC_URL'));
 for(const configured of [env,fallback,{...env,BOOTH_PUBLIC_URL:undefined,RAILWAY_SERVICE_ID:'test-deployed-service'}]){
  const denied=await configurationResponse(request(true,{origin:''}),{env:configured,staffCookie});
  assert.equal(denied.status,403);
 }
});

test('staff diagnostics show precise setup gaps, separate enabling flags, and never expose credential values',async()=>{
 const missingSms={...env,TWILIO_ACCOUNT_SID:undefined,TWILIO_AUTH_TOKEN:undefined,TWILIO_MESSAGING_SERVICE_SID:undefined,TWILIO_FROM_NUMBER:undefined,BOOTH_EMAIL_RECEIPTS_ENABLED:'false'};
 const response=await configurationResponse(request(true),{env:missingSms,staffCookie:await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET)}),body=await response.json();
 assert.equal(body.verification,'configuration-only');assert.equal(body.dependencies.configured,true);
 assert.equal(body.email.state,'configured');assert.equal(body.email.receiptsEnabled,false);
 assert.equal(body.sms.state,'needs-setup');assert.equal(body.sms.enabled,true);assert.equal(body.sms.providerConfigured,false);
 assert.deepEqual(body.sms.providerMissing,['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER']);
 assert.equal(body.sms.senderMode,null);
 const text=JSON.stringify(body);
 for(const value of Object.values(env).filter(value=>value!=='true'))assert(!text.includes(value),value);
 const disabled=deliveryReadiness({...env,BOOTH_SMS_ENABLED:'false'});
 assert.equal(disabled.sms.state,'disabled');assert.equal(disabled.sms.providerConfigured,true);assert.equal(disabled.sms.configured,false);
 assert.deepEqual(disabled.sms.missing,['BOOTH_SMS_ENABLED']);
});

test('configured provider settings cannot hide missing shared delivery dependencies',()=>{
 const status=deliveryReadiness({...env,DELIVERY_DATABASE_URL:''});
 assert.equal(status.email.providerConfigured,true);assert.equal(status.sms.providerConfigured,true);
 assert.equal(status.email.state,'needs-setup');assert.equal(status.sms.state,'needs-setup');
 assert.deepEqual(status.dependencies.missing,['DELIVERY_DATABASE_URL']);
});

test('public booth address rejects any embedded credentials',()=>{
 for(const url of ['https://owner:secret@booth.example.test','https://:secret@booth.example.test']){
  assert(configuration({...env,BOOTH_PUBLIC_URL:url}).email.missing.includes('BOOTH_PUBLIC_URL'));
 }
});

test('SMS sending and configuration use the same valid sender fallback',async()=>{
 for(const [settings,expectedField] of [[env,'MessagingServiceSid'],[{...env,TWILIO_MESSAGING_SERVICE_SID:'invalid'},'From']]){
  assert.equal(configuration(settings).sms.configured,true);
  const result=await sendProvider({channel:'sms',recipient:'+13155550124',publicToken:'a'.repeat(64),test:true},settings,async(url,options)=>{
   assert.equal(options.body.get(expectedField),expectedField==='From'?env.TWILIO_FROM_NUMBER:env.TWILIO_MESSAGING_SERVICE_SID);
   assert.equal(options.body.has(expectedField==='From'?'MessagingServiceSid':'From'),false);
   return Response.json({sid:'SM'+'d'.repeat(32),status:'queued'});
  });
  assert.equal(result.status,'queued');
 }
 let calls=0;
 await assert.rejects(()=>sendProvider({channel:'sms',recipient:'+13155550124',publicToken:'a'.repeat(64)}, {...env,TWILIO_MESSAGING_SERVICE_SID:'invalid',TWILIO_FROM_NUMBER:'invalid'},async()=>{calls++;}),error=>error.status===503);
 assert.equal(calls,0,'an invalid sender must never reach the provider');
});
