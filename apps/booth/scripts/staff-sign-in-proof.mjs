import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {createServer as createHttpsServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import {STAFF_COOKIE,makeStaffSession,validStaffSession} from '../app/lib/staff-auth.mjs';
import {rememberOfflineStaffPin} from '../app/lib/staff-offline-pin.mjs';

// Real local middleware + PIN endpoint over HTTPS, using a disposable test PIN
// and signed cookie. This proof cannot connect to a production service/database.
const tlsPort=Number(process.env.STAFF_SIGNIN_TLS_PORT||3409),httpPort=Number(process.env.STAFF_SIGNIN_HTTP_PORT||3410);
const base=`https://127.0.0.1:${tlsPort}`,pin='4826',secret='local-auth-proof-secret-at-least-32-characters';
const out=resolve(process.env.STAFF_SIGNIN_OUT_DIR||join(tmpdir(),'friendly-staff-signin-proof'));
const appRoot=fileURLToPath(new URL('../',import.meta.url));
const keyFile=join(out,'localhost-key.pem'),certFile=join(out,'localhost-cert.pem');
const results=[],allWrites=[];let nextProcess,proxy;
await mkdir(out,{recursive:true});
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-sha256','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});

async function waitForNext(){
 for(let attempt=0;attempt<100;attempt++){
  const ready=await new Promise(resolve=>{
   const request=httpRequest({hostname:'127.0.0.1',port:httpPort,path:'/staff/sign-in',method:'GET'},response=>{response.resume();resolve(response.statusCode===200);});
   request.on('error',()=>resolve(false));request.setTimeout(1000,()=>request.destroy());request.end();
  });
  if(ready)return;
  if(nextProcess.exitCode!==null)throw new Error('The local Next server stopped before it was ready.');
  await new Promise(resolve=>setTimeout(resolve,200));
 }
 throw new Error('The local Next server did not become ready. Build the booth before running this proof.');
}
const offlineStorage=new Map();
await rememberOfflineStaffPin({setItem:(key,value)=>offlineStorage.set(key,value)},pin);
const offlineVerifier=Object.fromEntries(offlineStorage);

try{
 const log=await import('node:fs').then(({createWriteStream})=>createWriteStream(join(out,'next.log')));
 nextProcess=spawn(process.execPath,[fileURLToPath(import.meta.resolve('next/dist/bin/next')),'start','-p',String(httpPort)],{cwd:appRoot,env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:'',BOOTH_PUBLIC_URL:base,BOOTH_SECURITY_ENFORCED:'true',BOOTH_STAFF_PIN_SHA256:createHash('sha256').update(pin).digest('hex'),BOOTH_STAFF_SESSION_SECRET:secret},stdio:['ignore','pipe','pipe']});
 nextProcess.stdout.pipe(log);nextProcess.stderr.pipe(log);
 await waitForNext();
 proxy=createHttpsServer({key:await readFile(keyFile),cert:await readFile(certFile)},(request,response)=>{
  const upstream=httpRequest({hostname:'127.0.0.1',port:httpPort,path:request.url,method:request.method,headers:{...request.headers,'x-forwarded-proto':'https'}},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response);});
  upstream.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstream);
 });
 await new Promise(resolve=>proxy.listen(tlsPort,'127.0.0.1',resolve));

 for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
  let browser,context,page;const errors=[];
  try{
   browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
   async function fixture({cookie,offlinePin=false,terminal,networkFailure=false}={}){
    await context?.close();context=await browser.newContext({viewport:{width:1024,height:768},ignoreHTTPSErrors:true,serviceWorkers:'block'});
    if(cookie)await context.addCookies([{name:STAFF_COOKIE,value:cookie,url:base+'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
    if(offlinePin)await context.addInitScript(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value);},offlineVerifier);
    let returned=false;
    await context.route('**/*',async route=>{
     const request=route.request(),url=new URL(request.url());
     if(url.origin!==base)return route.abort();
     if(request.method()==='POST'&&url.pathname==='/api/staff/unlock'){
      allWrites.push({engine,path:url.pathname});assert.equal(request.postDataJSON().pin,pin);
      return networkFailure?route.abort():route.continue();
     }
     if(!['GET','HEAD'].includes(request.method()))throw new Error('Unexpected write during staff sign-in: '+request.method()+' '+url.pathname);
     if(terminal&&request.isNavigationRequest()&&url.pathname+url.search===terminal){
      const session=(await context.cookies(base)).find(cookie=>cookie.name===STAFF_COOKIE)?.value;
      // Protected destination stubs are allowed only after its cookie has been
      // verified. The /setup auth probe always uses the real middleware/page.
      const protectedPage=['/setup','/event-prep','/print-test','/delivery-check','/test','/designs','/oct10-demo'].includes(url.pathname);
      if(!protectedPage||await validStaffSession(session,secret)){
       returned=true;return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Navigation destination</title><h1>Navigation destination</h1>'});
      }
     }
     return route.continue();
    });
    page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
    return {returned:()=>returned};
   }

   const guest='/?booth_event=AUTH-FIXTURE',destination='/event-prep?booth_event=AUTH-FIXTURE&returnTo='+encodeURIComponent(guest);
   await fixture({terminal:destination});
   const probes=[];page.on('response',response=>{const url=new URL(response.url());if(url.pathname==='/setup'&&url.searchParams.get('staff_auth_check')==='1')probes.push(response.status());});
   await page.goto(base+destination,{waitUntil:'networkidle'});
   let location=new URL(page.url());assert.equal(location.pathname,'/staff/sign-in');assert.equal(location.searchParams.get('next'),destination);
   await page.getByLabel('4-digit staff PIN',{exact:true}).fill(pin);await page.getByTestId('staff-confirm').click();
   await page.waitForURL(base+destination);await page.getByRole('heading',{name:'Navigation destination',exact:true}).waitFor();
   const session=(await context.cookies(base)).find(cookie=>cookie.name===STAFF_COOKIE);
   assert(session?.secure&&session.httpOnly&&session.sameSite==='Strict');assert(await validStaffSession(session.value,secret));assert(probes.includes(200));
   results.push({engine,case:'PIN returns to the requested event page',passed:true,eventScopePreserved:true,signedSecureSession:true,realMiddlewareProbe:true});

   const expired=await makeStaffSession(secret,Date.now()-16*60*1000);
   await fixture({cookie:expired,terminal:guest});await page.goto(base+destination,{waitUntil:'networkidle'});
   assert.equal(new URL(page.url()).pathname,'/staff/sign-in');assert.equal(new URL(page.url()).searchParams.get('next'),destination);
   await page.getByTestId('staff-cancel').click();await page.waitForURL(base+guest);
   results.push({engine,case:'Expired session Cancel returns to the same guest event',passed:true,eventScopePreserved:true});

   const forged=await makeStaffSession('another-local-proof-secret-at-least-32-characters');
   const loopDestination='/setup?booth_event=AUTH-FIXTURE&returnTo='+encodeURIComponent('/event-prep?booth_event=AUTH-FIXTURE');
   await fixture({cookie:forged});await page.goto(base+loopDestination,{waitUntil:'networkidle'});
   assert.equal(new URL(page.url()).pathname,'/staff/sign-in');
   await page.getByTestId('staff-cancel').click();await page.waitForURL(base+'/launch');
   await page.waitForTimeout(150);assert.equal(new URL(page.url()).pathname,'/launch');
   results.push({engine,case:'Forged session is blocked and Cancel never loops into protected setup',passed:true});

   await fixture({terminal:'/staff/start'});await page.goto(base+'/staff/sign-in?next='+encodeURIComponent('https://attacker.example/setup'),{waitUntil:'networkidle'});
   await page.getByLabel('4-digit staff PIN',{exact:true}).fill(pin);await page.getByTestId('staff-confirm').click();await page.waitForURL(base+'/staff/start');
   results.push({engine,case:'An external next URL falls back to event setup',passed:true});

   await fixture({offlinePin:true,networkFailure:true});await page.goto(base+destination,{waitUntil:'networkidle'});
   await page.getByLabel('4-digit staff PIN',{exact:true}).fill(pin);await page.getByTestId('staff-confirm').click();
   await page.locator('.staffSignInNotice[role="alert"]').waitFor();
   assert.match(await page.locator('.staffSignInNotice[role="alert"]').innerText(),/Connect to Wi-Fi/);assert.equal(new URL(page.url()).pathname,'/staff/sign-in');
   assert.equal(new URL(page.url()).searchParams.get('next'),destination);assert(await page.getByRole('button',{name:'Try staff PIN again',exact:true}).isVisible());
   assert.equal(await page.locator('.staffSignInBack').getAttribute('href'),guest);
   assert.equal((await context.cookies(base)).filter(cookie=>cookie.name===STAFF_COOKIE).length,0);
   await page.screenshot({path:join(out,engine+'-offline-sign-in.png')});
   results.push({engine,case:'Offline PIN cannot enter protected pages or cause a redirect loop',passed:true,retryAndBackAvailable:true});
   assert.deepEqual(errors,[]);
  }catch(error){
   results.push({engine,passed:false,message:error.message,stack:error.stack,errors});process.exitCode=1;
   await page?.screenshot({path:join(out,engine+'-failure.png'),fullPage:true}).catch(()=>{});
  }finally{await context?.close();await browser?.close();}
 }
}finally{
 if(proxy)await new Promise(resolve=>proxy.close(resolve));
 nextProcess?.kill('SIGTERM');
}
await writeFile(join(out,'results.json'),JSON.stringify({base,results,allWrites},null,2));
console.log(JSON.stringify({passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,out,results},null,2));
