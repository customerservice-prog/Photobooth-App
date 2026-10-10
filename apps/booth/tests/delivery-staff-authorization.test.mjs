import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStaffSession} from '../app/lib/staff-auth.mjs';
import {authorizeStaffEventDelivery,configuration,deliverySessionCookie,providerStatus,session} from '../app/lib/delivery.mjs';

const origin='https://booth.example.test';
const env={BOOTH_PUBLIC_URL:origin,DELIVERY_DATABASE_URL:'postgresql://local/unit-test',BOOTH_SESSION_SECRET:'delivery-test-session-secret-12345678',BOOTH_PAIRING_CODE:'delivery-test-pairing-code-123',BOOTH_STAFF_SESSION_SECRET:'staff-test-session-secret-12345678'};
const request=(method='POST',headers={})=>new Request(origin+'/api/staff/events/event-a',{method,headers:{origin,...headers}});
const authorized=async(req,response=new Response('approved event'),extra={})=>authorizeStaffEventDelivery(req,response,{staffCookie:await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET),env,...extra});
const withCookie=cookie=>request('POST',{cookie:cookie.split(';')[0]});

test('successful staff event POST automatically authorizes only an HttpOnly delivery session',async()=>{
 const response=await authorized(request());
 const cookie=response.headers.get('set-cookie');
 assert.match(cookie,/^__Host-booth-delivery=/);
 for(const attribute of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=43200'])assert(cookie.includes(attribute));
 const ticket=session(withCookie(cookie),env);
 assert(ticket);
 assert(ticket.expires>Date.now()+11*3600000&&ticket.expires<=Date.now()+12*3600000);
 assert.equal(await response.text(),'approved event');
 assert(!cookie.includes(env.BOOTH_SESSION_SECRET));
});

test('starting or reauthorizing the same iPad preserves its device quota and receipt identity',async()=>{
 const first=deliverySessionCookie(request(),env);
 const response=await authorized(withCookie(first));
 assert.equal(session(withCookie(response.headers.get('set-cookie')),env).device,session(withCookie(first),env).device);
});

test('forged prior delivery cookie is never reused as a device identity',async()=>{
 const first=deliverySessionCookie(request(),env);
 const forged=first.replace(/(=)[^;]+/,(_,prefix)=>prefix+'forged.signature');
 const response=await authorized(withCookie(forged));
 assert.notEqual(session(withCookie(response.headers.get('set-cookie')),env).device,session(withCookie(first),env).device);
});

test('event reads and failed, stale or incomplete event saves never authorize delivery',async()=>{
 for(const [method,status] of [['GET',200],['POST',400],['POST',401],['POST',403],['POST',409],['POST',503]]){
  const response=await authorized(request(method),new Response('unchanged',{status}));
  assert.equal(response.headers.get('set-cookie'),null);
 }
});

test('foreign or missing origin cannot issue delivery cookie even with a staff ticket',async()=>{
 for(const headers of [{origin:'https://attacker.example.test'},{origin:'null'},{origin:''}]){
  const response=await authorized(request('POST',headers));
  assert.equal(response.headers.get('set-cookie'),null);
 }
});

test('missing, forged or expired staff authorization cannot issue delivery cookie',async()=>{
 for(const staffCookie of [undefined,'forged',await makeStaffSession(env.BOOTH_STAFF_SESSION_SECRET,Date.now()-20*60000)]){
  const response=await authorizeStaffEventDelivery(request(),new Response('ok'),{env,staffCookie});
  assert.equal(response.headers.get('set-cookie'),null);
 }
});

test('incomplete delivery configuration keeps a successful event start available without pairing it',async()=>{
 for(const property of ['BOOTH_SESSION_SECRET','DELIVERY_DATABASE_URL','BOOTH_PAIRING_CODE','BOOTH_PUBLIC_URL']){
  const incomplete={...env,[property]:''};
  assert.equal(deliverySessionCookie(request(),incomplete),null);
  const response=await authorized(request(),new Response('ok'),{env:incomplete});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('set-cookie'),null);
 }
});

test('sending-only email credentials do not attempt to read provider receipts or claim delivery',async()=>{
 const sendingOnly={...env,BOOTH_EMAIL_RECEIPTS_ENABLED:'false'};
 assert.equal(configuration(sendingOnly).email.receiptsEnabled,false);
 let reads=0;
 await assert.rejects(()=>providerStatus({channel:'email',provider_id:'receipt-id',status:'queued'},sendingOnly,async()=>{reads++;throw new Error('must not read');}),/not enabled/);
 assert.equal(reads,0);
 assert.equal(configuration(env).email.receiptsEnabled,true,'existing receipt-capable integrations remain enabled');
});
