import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {createServer as createHttpsServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {STAFF_COOKIE,validStaffSession} from '../app/lib/staff-auth.mjs';
import {session} from '../app/lib/delivery.mjs';
import {workspace} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';

// Real local build, middleware, staff PIN, readiness and enable-sending endpoint.
// Only the send endpoint is mocked. Fixture provider keys and an unreachable
// local database make this incapable of sending messages or changing bookings.
const httpPort=Number(process.env.EMAIL_PROOF_HTTP_PORT||3440),tlsPort=Number(process.env.EMAIL_PROOF_TLS_PORT||3441);
const base='https://127.0.0.1:'+tlsPort,out='email-delivery-proof',pin='4826';
const fixtureEnv={...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:'',DELIVERY_DATABASE_URL:'postgresql://email_proof:fixture@127.0.0.1:1/never_connect',
 BOOTH_PUBLIC_URL:base,BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:createHash('sha256').update(pin).digest('hex'),BOOTH_STAFF_SESSION_SECRET:'local-email-proof-staff-session-secret-fixture-only',
 BOOTH_SESSION_SECRET:'local-email-proof-delivery-session-secret-fixture-only',BOOTH_PAIRING_CODE:'local-email-proof-owner-code-fixture-only',BOOTH_EMAIL_ENABLED:'true',BOOTH_EMAIL_FROM:'booth@fixture.example',
 RESEND_API_KEY:'re_local_fixture_never_sent_123456',BOOTH_EMAIL_RECEIPTS_ENABLED:'false',BOOTH_SMS_ENABLED:'false',TWILIO_ACCOUNT_SID:'',TWILIO_AUTH_TOKEN:'',TWILIO_MESSAGING_SERVICE_SID:'',TWILIO_FROM_NUMBER:''};
const event=workspace('?booth_event=email-proof-customer'),other=workspace('?booth_event=email-proof-other-customer');
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const fixturePhoto='data:image/jpeg;base64,'+(await sharp({create:{width:24,height:24,channels:3,background:'#30536b'}}).jpeg().toBuffer()).toString('base64');
const results=[];let nextProcess,proxy;
await mkdir(out,{recursive:true});
const tlsDirectory=await mkdtemp(join(tmpdir(),'friendly-email-proof-tls-')),keyFile=join(tlsDirectory,'key.pem'),certFile=join(tlsDirectory,'cert.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-sha256','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
async function waitForNext(){
 for(let attempt=0;attempt<100;attempt++){
  const ready=await new Promise(resolve=>{const r=httpRequest({hostname:'127.0.0.1',port:httpPort,path:'/api/app-version'},response=>{response.resume();resolve(response.statusCode===200);});r.on('error',()=>resolve(false));r.setTimeout(1000,()=>r.destroy());r.end();});
  if(ready)return;if(nextProcess.exitCode!==null)throw new Error('Local Next server stopped before readiness.');await new Promise(resolve=>setTimeout(resolve,200));
 }throw new Error('Build the booth before running the local email proof.');
}
async function snapshot(page){
 return page.evaluate(async source=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {openArchive};')(),db=await api.openArchive();
  try{const rows=await new Promise((resolve,reject)=>{const r=db.transaction('captures','readonly').objectStore('captures').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
   const bytes=value=>value?Array.from(new Uint8Array(value)):null;
   return {storage:Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])),archive:rows.map(row=>({...row,poses:row.poses.map(bytes),collage:bytes(row.collage),keepsake:bytes(row.keepsake)})).sort((a,b)=>a.key.localeCompare(b.key))};
  }finally{db.close();}
 },archiveSource);
}
const deliveryCookies=async context=>(await context.cookies(base)).filter(cookie=>cookie.name==='__Host-booth-delivery');
async function proof(browser,engine){
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true,serviceWorkers:'block',reducedMotion:'reduce'});
 const page=await context.newPage(),writes=[],unexpected=[],external=[],payloads=[],errors=[];let configReads=0;
 page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==base){external.push(url.origin+url.pathname);return route.abort();}
  if(url.pathname==='/api/delivery/config')configReads++;
  if(url.pathname==='/api/delivery/status'||/^\/api\/(staff\/events|booth\/|print|archive|upload)/.test(url.pathname)){unexpected.push({method:request.method(),path:url.pathname});return route.abort();}
  if(!['GET','HEAD'].includes(request.method())){
   writes.push({method:request.method(),path:url.pathname});
   if(url.pathname==='/api/delivery'&&request.method()==='POST'){
    payloads.push(request.postDataJSON());
    // Simulate an ambiguous connection failure; the retry must reuse all bytes
    // and the same request ID instead of risking a duplicate message.
    if(payloads.length===1)return route.abort('failed');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:'11111111-2222-4333-8444-555555555555',receiptToken:'local-fixture-receipt-only',channel:'email',recipient:'operator@fixture.example',status:'queued',message:'Queued for sending.'})});
   }
   if(!['/api/staff/unlock','/api/delivery/session/staff'].includes(url.pathname)){unexpected.push({method:request.method(),path:url.pathname});return route.abort();}
  }
  return route.continue();
 });
 await context.addInitScript(()=>{window.__emailProofPrints=0;window.__emailProofCameras=0;window.print=()=>{window.__emailProofPrints++;};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__emailProofCameras++;throw new Error('Email rehearsal cannot open the camera');}}});});
 try{
  const destination='/delivery-check?booth_event='+event.id;
  await page.goto(base+destination,{waitUntil:'networkidle'});
  assert.equal(new URL(page.url()).pathname,'/staff/sign-in');assert.equal(new URL(page.url()).searchParams.get('next'),destination);
  assert.equal((await deliveryCookies(context)).length,0);
  const unsignedConfig=await context.request.get(base+'/api/delivery/config?staff=1',{headers:{'Origin':base}});assert.equal(unsignedConfig.status(),401);
  const unsignedEnable=await context.request.post(base+'/api/delivery/session/staff',{headers:{'Origin':base}});assert.equal(unsignedEnable.status(),401);assert.equal((await deliveryCookies(context)).length,0);
  await page.getByLabel('4-digit staff PIN',{exact:true}).fill(pin);await page.getByTestId('staff-confirm').click();await page.waitForURL(base+destination);
  await page.getByRole('heading',{name:'Email delivery test',exact:true}).waitFor();
  const staffCookie=(await context.cookies(base)).find(cookie=>cookie.name===STAFF_COOKIE);assert(staffCookie?.httpOnly&&staffCookie.secure&&staffCookie.sameSite==='Strict');assert(await validStaffSession(staffCookie.value,fixtureEnv.BOOTH_STAFF_SESSION_SECRET));
  await page.getByRole('button',{name:'Enable sending on this device',exact:true}).waitFor();
  assert.equal((await deliveryCookies(context)).length,0,'staff sign-in and initial diagnostic GET do not authorize delivery');
  await page.evaluate(async({event,other,activeKey,source,jpeg})=>{
   const cfg={eventId:event.id,title:'Customer fixture',date:'October 10, 2026',defaultTemplate:'grad-gala',guestMode:'approved'};
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture,saveKeepsake};')();
   for(const target of [event,other]){localStorage.setItem(target.config,JSON.stringify({...cfg,eventId:target.id}));localStorage.setItem(target.usage,'23');localStorage.setItem(target.photos,'[]');await api.saveCapture(target.archive,'saved-customer-photo',jpeg,[jpeg],cfg);await api.saveKeepsake(target.archive,'saved-customer-photo',new Blob([Uint8Array.from(atob(jpeg.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/jpeg'}));}
   localStorage.setItem(activeKey,event.id);localStorage.setItem('shared-staff-setting','keep');
  },{event,other,activeKey:ACTIVE_EVENT_KEY,source:archiveSource,jpeg:fixturePhoto});
  const before=await snapshot(page);
  const enableGET=await context.request.get(base+'/api/delivery/session/staff');assert.equal(enableGET.status(),405);assert.equal((await deliveryCookies(context)).length,0,'GET cannot authorize a device');
  const setup=page.locator('.deliverySetupDetails');await setup.locator(':scope > summary').click();
  const readsBefore=configReads;await page.getByRole('button',{name:'Refresh configuration',exact:true}).click();await page.waitForLoadState('networkidle');assert(configReads>readsBefore);
  assert.equal((await deliveryCookies(context)).length,0,'refresh remains read-only');assert.equal(writes.filter(write=>write.path==='/api/delivery/session/staff').length,0);
  assert.match(await page.getByTestId('delivery-readiness-sms').innerText(),/Optional.*off/);
  await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Enable sending on this device',exact:true}).waitFor();assert.equal((await deliveryCookies(context)).length,0,'reopening the test cannot enable sending');
  assert.deepEqual(await snapshot(page),before,'loading and refreshing leave both customer archives and counters unchanged');
  const foreignEnable=await context.request.post(base+'/api/delivery/session/staff',{headers:{'Origin':'https://untrusted.fixture.example'}});assert.equal(foreignEnable.status(),403);assert.equal((await deliveryCookies(context)).length,0);
  const enableReply=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/delivery/session/staff');await page.getByRole('button',{name:'Enable sending on this device',exact:true}).click();
  const enabled=await enableReply;assert.equal(enabled.status(),200);assert.equal((await enabled.json()).hours,12);await page.getByText('This device is enabled for sending.',{exact:true}).waitFor();
  const [cookie]=await deliveryCookies(context);assert(cookie?.httpOnly&&cookie.secure&&cookie.sameSite==='Strict');assert(cookie.expires>Date.now()/1000+43100&&cookie.expires<=Date.now()/1000+43260,'delivery session lasts 12 hours');
  assert(session(new Request(base,{headers:{cookie:cookie.name+'='+cookie.value}}),fixtureEnv),'the real server-issued delivery cookie has a valid signature');
  assert.equal(writes.filter(write=>write.path==='/api/delivery/session/staff').length,1,'only the explicit button authorizes this device');
  assert.equal(await page.getByLabel('Send by',{exact:true}).count(),0);assert.equal(await page.locator('select').count(),0);assert.equal(await page.getByText(/Message\/data rates/).count(),0);
  const email=page.getByLabel('Your email address',{exact:true}),consent=page.locator('.deliveryForm input[type="checkbox"]'),send=page.getByRole('button',{name:'Send TEST email',exact:true});
  assert(await send.isDisabled());await email.fill('operator@fixture.example');assert(await send.isDisabled());await consent.check();assert(await send.isEnabled());
  const sample=page.locator('.deliveryTestPreview');await page.waitForFunction(()=>document.querySelector('.deliveryTestPreview')?.naturalWidth>0);
  const displayed=await sample.getAttribute('src'),bytes=Buffer.from(displayed.split(',')[1],'base64'),meta=await sharp(bytes).metadata();assert.equal(meta.format,'jpeg');assert.equal(meta.width,1200);assert.equal(meta.height,1400);
  await writeFile(out+'/'+engine+'-test-sample.jpg',bytes);await page.screenshot({path:out+'/'+engine+'-tablet-enabled.png',fullPage:true});
  await send.click();const retry=page.getByRole('button',{name:'Check this request',exact:true});await retry.waitFor();assert(await email.isDisabled());assert(await consent.isDisabled());assert(await consent.isChecked());
  assert.match(await page.locator('.directDelivery .error[role="alert"]').innerText(),/Connection interrupted/);assert.equal(payloads.length,1);assert.equal(payloads[0].photo,displayed,'the exact displayed TEST JPEG is sent');assert.equal(payloads[0].channel,'email');assert.equal(payloads[0].recipient,'operator@fixture.example');assert.equal(payloads[0].consent,true);assert.equal(payloads[0].test,true);assert.match(payloads[0].requestId,/^[0-9a-f-]{36}$/);
  await retry.click();await page.locator('.deliveryReceipt').waitFor();assert.equal(payloads.length,2);assert.deepEqual(payloads[1],payloads[0],'retry reuses frozen recipient, consent, image and request ID');
  assert.match(await page.locator('.deliveryReceipt').innerText(),/email service accepted.*delivery has not been confirmed/is);assert.equal(await page.getByRole('button',{name:'Check provider receipt',exact:true}).count(),0);assert.equal(await page.locator('.deliveryReceipt button').count(),0);assert(await email.isDisabled());assert(await consent.isDisabled());
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone layout has no horizontal overflow');await page.screenshot({path:out+'/'+engine+'-phone-accepted.png',fullPage:true});
  assert.deepEqual(await snapshot(page),before,'authorization and mock sending preserve original/finished photos, all counters and settings');assert.deepEqual(unexpected,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(writes,[{method:'POST',path:'/api/staff/unlock'},{method:'POST',path:'/api/delivery/session/staff'},{method:'POST',path:'/api/delivery'},{method:'POST',path:'/api/delivery'}],'only staff sign-in, explicit authorization and the identical mocked send/retry may write');
  assert.deepEqual(await page.evaluate(()=>({prints:window.__emailProofPrints,cameras:window.__emailProofCameras})),{prints:0,cameras:0});
  await page.reload({waitUntil:'networkidle'});await page.getByText('This device is enabled for sending.',{exact:true}).waitFor();assert.equal(writes.filter(write=>write.path==='/api/delivery/session/staff').length,1,'refresh retains authorization without another POST');assert.deepEqual(await snapshot(page),before);
  results.push({engine,passed:true,realStaffProtection:true,diagnosticGETsReadOnly:true,explicitEnablePOST:true,secure12HourCookie:true,emailOnly:true,exactTestJPEG:true,identicalRetryPayload:true,honestAcceptedStatus:true,noProviderReceiptCheck:true,customerStorageUnchanged:true,realMessagesSent:0,writes,configurationReads:configReads});
 }catch(error){await page.screenshot({path:out+'/'+engine+'-failure.png',fullPage:true}).catch(()=>{});results.push({engine,passed:false,error:error.message,stack:error.stack,writes,unexpected,errors});throw error;}
 finally{await context.close();}
}
try{
 const log=createWriteStream(out+'/server.log');nextProcess=spawn(process.execPath,[fileURLToPath(import.meta.resolve('next/dist/bin/next')),'start','-p',String(httpPort)],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:fixtureEnv,stdio:['ignore','pipe','pipe']});nextProcess.stdout.pipe(log);nextProcess.stderr.pipe(log);await waitForNext();
 proxy=createHttpsServer({key:await readFile(keyFile),cert:await readFile(certFile)},(request,response)=>{const upstream=httpRequest({hostname:'127.0.0.1',port:httpPort,path:request.url,method:request.method,headers:{...request.headers,'x-forwarded-proto':'https'}},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response);});upstream.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstream);});await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(tlsPort,'127.0.0.1',resolve);});
 for(const [engine,api]of [['chromium',chromium],['webkit',webkit]]){const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});try{await proof(browser,engine);}finally{await browser.close();}}
}catch(error){if(!results.some(result=>!result.passed))results.push({test:'harness',passed:false,error:error.message});console.error(error);process.exitCode=1;}
finally{if(proxy)await new Promise(resolve=>proxy.close(resolve));nextProcess?.kill('SIGTERM');await rm(tlsDirectory,{recursive:true,force:true});await writeFile(out+'/results.json',JSON.stringify({realMessagesSent:0,results},null,2));}
console.log(JSON.stringify({passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,realMessagesSent:0},null,2));
