import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {octoberPreset,workspace} from '../app/lib/event-workspace.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';

// Exercise the real capture, IndexedDB queue and coordinator in isolated storage.
// Only the backup HTTP boundary is mocked; server authorization and PostgreSQL
// are covered separately by the route and real-database tests. Never use this
// write-capable fixture against a deployed booth or a customer's event.
const base=(process.env.AUTOMATIC_BACKUP_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const origin=new URL(base).origin;
assert(new URL(base).protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Automatic backup fixtures are restricted to a local HTTP test server');
const engines=process.env.AUTOMATIC_BACKUP_CHROMIUM_ONLY==='1'?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const out='automatic-backup-proof',results=[];
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const eventId='automatic-backup-proof',scope=workspace('?booth_event='+eventId);
const proof='fixture-event-bound-proof-not-a-real-credential';
const config={...octoberPreset(),eventId,title:'Automatic Backup Verification',date:'October 9, 2026',guestMode:'approved',approvedPrintName:'Automatic Backup Verification',defaultTemplate:'champagne',photoPauseSeconds:30,adminHandoff:{version:1,syncTicket:proof}};

async function archive(page){
 return page.evaluate(async({source,scope})=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
  const rows=await api.listCaptures(scope);
  const bytes=async blob=>blob?Array.from(new Uint8Array(await blob.arrayBuffer())):null;
  return Promise.all(rows.map(async row=>({id:row.id,poses:await Promise.all(row.poses.map(bytes)),collage:await bytes(row.collage),keepsake:await bytes(row.keepsake)})));
 },{source:archiveSource,scope:scope.archive});
}
async function waitForArchive(page,predicate,label){
 const deadline=Date.now()+20000;
 do{const rows=await archive(page);if(predicate(rows))return rows;await page.waitForTimeout(100);}while(Date.now()<deadline);
 throw new Error(label+' was not durably archived');
}
async function waitReady(page,total){
 await page.waitForFunction(({key,total})=>{
  const status=JSON.parse(localStorage.getItem(key)||'null');
  return status?.state==='ready'&&status.total===total&&status.pending===0&&status.saved===total;
 },{key:'friendly-booth-backup-status-v1-'+eventId,total},{timeout:20000});
}
async function capture(page,total){
 await page.getByTestId(total===1?'welcome-quick-photo':'welcome-four-photo').click();
 const deadline=Date.now()+110000;
 while(!await page.getByTestId('approved-guest-preview').count()){
  assert(Date.now()<deadline,total+' photo capture did not finish');
  const ready=page.getByRole('button',{name:/I’m ready — start countdown/});
  if(await ready.count())await ready.click().catch(()=>{});
  await page.waitForTimeout(100);
 }
 await page.getByTestId('approved-finished-jpeg').waitFor();
 assert.equal(await page.getByTestId('approved-guest-preview').getAttribute('data-template'),config.defaultTemplate);
 assert.equal(await page.getByTestId('approved-guest-preview').getAttribute('data-output-layout'),total===1?'card':'photo_strip');
 assert.equal(await page.locator('.agPaperWrap img').count(),1,'guest receives one finished design');
 assert.equal(await page.locator('.agDock button').count(),3,'backup adds no guest decisions');
 const src=await page.getByTestId('approved-finished-jpeg').getAttribute('src');
 assert(src?.startsWith('data:image/jpeg;base64,'));
 return Buffer.from(src.split(',')[1],'base64');
}
async function done(page){await page.getByTestId('approved-done').click();await page.getByTestId('welcome-four-photo').waitFor();}

// A bounded readiness wait allows the CI server to start in the same shell.
let ready=false;
for(let attempt=0;attempt<60;attempt++){
 try{const response=await fetch(base+'/api/app-version',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}}catch{}
 await new Promise(resolve=>setTimeout(resolve,500));
}
assert(ready,'Local proof server did not start');

try{
 for(const [engine,api] of engines){
  const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
  const saved=new Map(),attempts=[],authorizations=[],unexpectedWrites=[],errors=[],boundaryErrors=[];
  let networkAllowed=true,expireFirstUpload=true;
  // WebKit does not expose Blob request bodies in Playwright's intercepted
  // request metadata. Receive the real HTTP stream instead; an unchanged
  // route.continue body preserves the browser's original upload bytes.
  const backupServer=createServer(async(request,response)=>{
   const reply=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-Booth-Event, X-Booth-Capture, X-Booth-Kind'});response.end(JSON.stringify(data));};
   try{
    if(request.method==='OPTIONS')return reply(204,{});
    const chunks=[];for await(const chunk of request)chunks.push(chunk);
    const bytes=Buffer.concat(chunks);
    if(request.method==='POST'&&request.url==='/api/backup/authorize'){
     const body=JSON.parse(bytes.toString('utf8'));
     assert.deepEqual(body,{eventId,syncTicket:proof},'loaded event proof authorizes automatically without a staff login');
     authorizations.push(body);
     return reply(200,{token:'fixture-backup-token-'+authorizations.length});
    }
    assert.equal(request.method,'POST');assert.equal(request.url,'/api/backup/image');
    const headers=request.headers,kind=headers['x-booth-kind'],id=headers['x-booth-capture'];
    assert.equal(headers['x-booth-event'],eventId,'every image remains bound to the loaded event');
    assert.match(kind,/^(pose-[1-4]|collage|keepsake)$/);
    assert.match(headers.authorization,/^Bearer fixture-backup-token-\d+$/);
    assert(bytes.length>0&&bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217,'uploaded original is a complete JPEG');
    attempts.push({id,kind});
    if(expireFirstUpload){expireFirstUpload=false;return reply(401,{error:'Expired test ticket'});}
    const key=id+'/'+kind,old=saved.get(key);
    if(old)assert.deepEqual(old,bytes,'a retried image retains the original bytes');
    saved.set(key,Buffer.from(bytes));
    // Let the next original or keepsake commit while a worker is in flight.
    await new Promise(resolve=>setTimeout(resolve,300));
    return reply(200,{ok:true});
   }catch(error){boundaryErrors.push(error.message);return reply(500,{error:'Backup fixture rejected request'});}
  });
  await new Promise((resolve,reject)=>{backupServer.once('error',reject);backupServer.listen(0,'127.0.0.1',resolve);});
  const backupOrigin='http://127.0.0.1:'+backupServer.address().port;
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin)return route.abort();
   if(request.method()==='POST'&&['/api/backup/authorize','/api/backup/image'].includes(url.pathname)){
    if(!networkAllowed)return route.abort('internetdisconnected');
    return route.continue({url:backupOrigin+url.pathname});
   }
   if(!['GET','HEAD'].includes(request.method())){unexpectedWrites.push({method:request.method(),path:url.pathname});return route.abort();}
   if(/^\/(setup|staff|event-prep)(\/|$)/.test(url.pathname)){unexpectedWrites.push({path:url.pathname});return route.abort();}
   return route.continue();
  });
  await context.addInitScript(({config,scope})=>{
   if(!localStorage.getItem(scope.config))localStorage.setItem(scope.config,JSON.stringify(config));
   if(!localStorage.getItem(scope.usage))localStorage.setItem(scope.usage,'17');
   window.__backupCameraDraws=0;window.__backupPrints=0;window.__backupShares=0;
   window.print=()=>{window.__backupPrints++;throw new Error('Backup proof must not print');};
   Object.defineProperty(navigator,'share',{configurable:true,value:()=>{window.__backupShares++;throw new Error('Backup proof must not send');}});
   Object.defineProperty(window,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('Use visual countdown in test');}}});
   Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLVideoElement)window.__backupCameraDraws++;return original.call(this,source,...args);};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{
    if(options.audio!==false)throw new Error('Camera requested a microphone');
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');let frame=0;
    const draw=()=>{frame++;ctx.fillStyle=['#286888','#6f396b','#5b7941','#8e512d'][Math.floor(frame/8)%4];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff9e0';ctx.font='bold 62px sans-serif';ctx.fillText('POSE '+frame,100,245);ctx.fillRect(frame%580,310,26,28);};
    draw();const stream=canvas.captureStream(20),timer=setInterval(draw,70),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);
    track.stop=()=>{clearInterval(timer);stop();};return stream;
   }}});
  },{config,scope});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(base+scope.home,{waitUntil:'networkidle'});
   await page.getByTestId('welcome-four-photo').waitFor();
   const before=await page.evaluate(({config,usage})=>({config:localStorage.getItem(config),usage:localStorage.getItem(usage)}),scope);
   const release=await page.evaluate(async()=>{const response=await fetch('/api/app-version');return (await response.json()).version;});
   assert.equal(release,BOOTH_RELEASE);
   const one=await capture(page,1);
   const first=await waitForArchive(page,rows=>rows.length===1&&rows[0].keepsake,'One-photo keepsake');
   assert.deepEqual(Buffer.from(first[0].keepsake),one,'the preview and saved finished image match exactly');
   await waitReady(page,3);
   assert.equal(authorizations.length,2,'expired ticket renews automatically once without staff');
   assert.equal(saved.size,3,'one photo saves its original, collage and finished design');
   await done(page);

   // Genuine browser offline mode must preserve and finish a session locally.
   await context.setOffline(true);networkAllowed=false;
   const four=await capture(page,4);
   const offlineRows=await waitForArchive(page,rows=>rows.length===2&&rows[1].keepsake,'Offline four-photo keepsake');
   assert.equal(offlineRows[1].poses.length,4);
   assert.deepEqual(Buffer.from(offlineRows[1].keepsake),four);
   assert.equal(saved.size,3,'offline capture never pretends to reach the backend');
   await page.waitForFunction(key=>{const s=JSON.parse(localStorage.getItem(key)||'null');return s?.state==='offline'&&s.pending===6;},'friendly-booth-backup-status-v1-'+eventId);
   assert(!/Saved to the event gallery|saved online/i.test(await page.getByTestId('approved-gallery-status').innerText()),'guest status does not claim a backend acknowledgment while offline');
   const state=await page.evaluate(()=>({draws:window.__backupCameraDraws,prints:window.__backupPrints,shares:window.__backupShares}));
   assert.deepEqual(state,{draws:5,prints:0,shares:0},'backup never changes capture count or triggers printing/sharing');
   await page.screenshot({path:out+'/'+engine+'-offline-finished.png'});

   // Reload while the application is reachable but backup requests still fail.
   // The durable queue and all pending originals must survive the new document.
   await context.setOffline(false);
   await page.reload({waitUntil:'networkidle'});
   const reloadedRows=await waitForArchive(page,rows=>rows.length===2&&rows[1].keepsake,'Reloaded pending capture');
   assert.deepEqual(reloadedRows,offlineRows,'reload preserves every queued original and finished JPEG');
   assert.equal(saved.size,3);
   networkAllowed=true;
   await page.evaluate(()=>dispatchEvent(new Event('online')));
   await waitReady(page,9);
   assert.equal(saved.size,9,'reconnection uploads all six offline files');

   // An interrupted four-photo sequence still keeps its first original.
   await page.getByTestId('welcome-four-photo').click();
   await page.waitForFunction(()=>document.querySelector('.pcStage')?.getAttribute('data-completed')==='1',null,{timeout:35000});
   await page.getByRole('button',{name:'Cancel session',exact:true}).click();
   await page.getByTestId('welcome-four-photo').waitFor();
   const interrupted=await waitForArchive(page,rows=>rows.length===3&&rows[2].poses.length===1,'Interrupted original');
   assert.equal(interrupted[2].collage,null);assert.equal(interrupted[2].keepsake,null);
   await waitReady(page,10);
   assert.equal(saved.size,10,'the interrupted original uploads without an invented finished layout');

   const archived=await archive(page);
   for(const row of archived){
    for(const [kind,bytes] of [...row.poses.map((bytes,index)=>['pose-'+(index+1),bytes]),['collage',row.collage],['keepsake',row.keepsake]]){
     if(bytes)assert.deepEqual(saved.get(row.id+'/'+kind),Buffer.from(bytes),'every backend acknowledgment covers exact archived JPEG bytes');
    }
   }
   const attemptsBeforeReload=attempts.length;
   await page.reload({waitUntil:'networkidle'});await waitReady(page,10);
   assert.equal(attempts.length,attemptsBeforeReload,'acknowledged images are not uploaded again after reload');
   assert.deepEqual(await archive(page),archived,'upload acknowledgments never remove the local archive');
   assert.deepEqual(await page.evaluate(({config,usage})=>({config:localStorage.getItem(config),usage:localStorage.getItem(usage)}),scope),before,'automatic backup leaves the approved design and print allowance unchanged');
   assert.deepEqual(unexpectedWrites,[]);assert.deepEqual(errors,[]);assert.deepEqual(boundaryErrors,[]);
   results.push({engine,passed:true,release,browserVersion:browser.version(),sessions:3,originals:6,collages:2,finishedDesigns:2,backendFiles:saved.size,exactJPEGBytes:true,automaticWithoutStaff:true,expiredTicketRenewed:true,offlineCaptureAndReload:true,interruptedOriginalRetained:true,acknowledgmentsDeduplicated:true,serverBoundary:'local HTTP fixture with actual wire bytes; authorization and database verified by separate tests',unexpectedWrites});
  }catch(error){await page.screenshot({path:out+'/'+engine+'-failure.png',fullPage:true}).catch(()=>{});results.push({engine,passed:false,message:error.message,stack:error.stack,unexpectedWrites,errors,boundaryErrors});throw error;}
  finally{await context.close();await browser.close();await new Promise(resolve=>backupServer.close(resolve));}
 }
 console.log(JSON.stringify(results,null,2));
}finally{await writeFile(out+'/results.json',JSON.stringify(results,null,2)+'\n');}
