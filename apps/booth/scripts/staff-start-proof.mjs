import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,request as httpRequest} from 'node:http';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {workspace} from '../app/lib/event-workspace.mjs';
import {configFromBoothHandoff,validateBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {tokenKey,backupStatusKey} from '../app/lib/backup-sync.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {validateCustomDesign} from '../app/lib/custom-design.mjs';

// Real staff page, preview, capture, IndexedDB and backup coordinator. Only the
// authenticated HTTP/DB boundary is a fixture. A same-origin loopback receiver
// reads real uploaded JPEG bytes, including on WebKit. Never run on production.
const base=(process.env.STAFF_START_PROOF_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
assert(new URL(base).protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(new URL(base).hostname),'Staff start write fixtures require a local HTTP server');
const engines=process.env.STAFF_START_CHROMIUM_ONLY==='1'?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const out='staff-start-proof',results=[];
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const eventId='staff-start-proof-event',otherId='staff-start-untouched-event';
const scope=workspace('?booth_event='+eventId),other=workspace('?booth_event='+otherId);
const token=Buffer.from(JSON.stringify({id:eventId,fixture:true})).toString('base64url')+'.'+'a'.repeat(43);
const initialPayload=validateBoothHandoff({v:1,id:eventId,rev:'2026-10-09T14:00:00.000Z',title:'Staff Start Verification',date:'2026-10-10',start:'16:00',end:'20:00',type:'wedding',f:'four',p:6,mode:'card',s:1,fit:'fill',a:'#32463e',b:'#d4ad73',limit:108,on:true,qr:true,design:'fpr-wedding',name:'Test Couple',year:'',guest:'approved'});
const previousConfig=configFromBoothHandoff(initialPayload);
const oldConfig={...previousConfig,adminHandoff:{...previousConfig.adminHandoff,syncTicket:'former-owner-proof.'+'b'.repeat(43)},staffNote:'keep selected event metadata'};
const otherConfig={...configFromBoothHandoff({...initialPayload,id:otherId,title:'Other event'}),staffNote:'never change this event'};
async function archive(page,target=scope.archive){
 return page.evaluate(async({source,target})=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
  const bytes=async blob=>blob?Array.from(new Uint8Array(await blob.arrayBuffer())):null;
  return Promise.all((await api.listCaptures(target)).map(async row=>({id:row.id,poses:await Promise.all(row.poses.map(bytes)),collage:await bytes(row.collage),keepsake:await bytes(row.keepsake)})));
 },{source:archiveSource,target});
}
async function waitSaved(page,total){
 await page.waitForFunction(({key,total})=>{const status=JSON.parse(localStorage.getItem(key)||'null');return status?.state==='ready'&&status.total===total&&status.saved===total&&status.pending===0;},{key:backupStatusKey(eventId),total},{timeout:30000});
}
async function capture(page,shots,design){
 const beforeSelection=await archive(page);
 await page.getByTestId(shots===1?'welcome-quick-photo':'welcome-four-photo').click();
 const proof=page.getByTestId('welcome-large-proof');
 assert.equal(await proof.getAttribute('data-selected-photos'),String(shots));
 assert.equal(await proof.locator('svg').count(),1,'one actual print preview before capture');
 assert.deepEqual(await archive(page),beforeSelection,'layout selection and sample photos do not save a guest session');
 await page.getByTestId('welcome-start-session').click();
 const deadline=Date.now()+100000;
 while(!await page.getByTestId('approved-guest-preview').count()){
  assert(Date.now()<deadline,'The '+shots+'-photo session did not finish');
  const ready=page.getByRole('button',{name:/I’m ready — start countdown/});
  if(await ready.count())await ready.click().catch(()=>{});
  await page.waitForTimeout(100);
 }
 await page.getByTestId('approved-finished-jpeg').waitFor();
 assert.equal(await page.getByTestId('approved-guest-preview').getAttribute('data-template'),design);
 assert.equal(await page.getByTestId('approved-guest-preview').getAttribute('data-output-layout'),shots===1?'card':'photo_strip');
 assert.equal(await page.locator('.agPaperWrap img').count(),1,'guest sees one finished design');
 assert.equal(await page.locator('.agDock button').count(),3,'only Print, Send and Done');
 assert.equal(await page.getByRole('group',{name:'Keepsake designs'}).count(),0,'guests cannot choose another design');
 const image=await page.getByTestId('approved-finished-jpeg').getAttribute('src');assert(image?.startsWith('data:image/jpeg;base64,'));
 await page.screenshot({path:out+'/'+design+'-'+shots+'-finished-'+page.__proofEngine+'.png'});
 return Buffer.from(image.split(',')[1],'base64');
}
async function done(page){await page.getByTestId('approved-done').click();await page.getByTestId('welcome-four-photo').waitFor();await page.waitForLoadState('networkidle');}
async function pin(page){await page.getByTestId('staff-start-pin').fill('2018');await page.getByTestId('staff-start-unlock').click();await page.getByTestId('staff-event-select').waitFor();}
async function openStaff(page,origin){await page.goto(origin+'/staff/start?event='+eventId,{waitUntil:'networkidle'});if(await page.getByTestId('staff-start-pin').count())await pin(page);await page.getByTestId('staff-start-event').waitFor();}
async function readyProofs(page){for(const kind of ['one','four'])await page.getByTestId('staff-layout-preview-'+kind).evaluate(image=>image.complete&&image.naturalWidth>0||new Promise((resolve,reject)=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',()=>reject(new Error('Preview image failed')),{once:true});}));}
async function visibleInViewport(page,locator,message){
 assert(await locator.isVisible(),message+' is visible');
 const box=await locator.boundingBox(),viewport=page.viewportSize();
 assert(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,message+' fits inside the viewport: '+JSON.stringify({box,viewport}));
 assert(await locator.evaluate(node=>{const box=node.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return hit===node||node.contains(hit);}),message+' is not covered by another control');
}
async function previewSvg(page,kind){await readyProofs(page);return decodeURIComponent((await page.getByTestId('staff-layout-preview-'+kind).getAttribute('src')).split(',').slice(1).join(','));}
async function resetSetupScroll(page){await page.evaluate(()=>{document.querySelector('.staffStartPage')?.scrollTo(0,0);scrollTo(0,0);});}
async function pageUpToStart(page){
 const positions=[await page.locator('.staffStartPage').evaluate(main=>main.scrollTop)];
 for(let press=0;press<4&&positions.at(-1)!==0;press++){
  const previous=positions.at(-1);await page.keyboard.press('PageUp');
  positions.push(await page.evaluate(previous=>new Promise(resolve=>{
   const main=document.querySelector('.staffStartPage'),deadline=performance.now()+2000;let last=main.scrollTop,stable=0;
   const read=()=>{const top=main.scrollTop;stable=top===last?stable+1:0;last=top;if(top===0||(top<previous&&stable>=3)||performance.now()>deadline)resolve(top);else requestAnimationFrame(read);};requestAnimationFrame(read);
  }),previous));
 }
 assert.equal(positions.at(-1),0,'Native PageUp returns to the event picker within four presses; scrollTop history: '+JSON.stringify(positions));
 return positions;
}
async function artworkReplacementProof(page,engine){
 await page.getByTestId('staff-custom-edit').click();await page.getByTestId('staff-custom-dialog').waitFor();await page.getByRole('radio',{name:'Upload artwork',exact:true}).check();
 for(const [kind,color]of [['one','#173657'],['four','#392647']]){
  const png=await sharp({create:{width:1200,height:1800,channels:3,background:color}}).png().toBuffer();
  await page.getByTestId('custom-upload-'+kind).setInputFiles({name:kind+'-ui-artwork.png',mimeType:'image/png',buffer:png});
  await page.getByTestId('custom-upload-'+kind).locator('..').getByRole('status').filter({hasText:'Artwork ready'}).waitFor();
 }
 await page.getByTestId('staff-custom-done').click();await page.waitForFunction(()=>!document.querySelector('[data-testid="staff-start-event"]').disabled);await readyProofs(page);
 // Hold a real FileReader to verify the old valid artwork cannot start while its replacement is preparing.
   const previousOne=await previewSvg(page,'one'),previousFour=await previewSvg(page,'four');
   await page.getByTestId('staff-custom-edit').click();await page.getByTestId('staff-custom-dialog').waitFor();
   await page.evaluate(()=>{const native=FileReader.prototype.readAsDataURL;FileReader.prototype.readAsDataURL=function(file){FileReader.prototype.readAsDataURL=native;window.__staffArtworkReadWaiting=true;window.__releaseStaffArtworkRead=()=>{window.__staffArtworkReadWaiting=false;native.call(this,file);};};});
   const replacement=await sharp({create:{width:1200,height:1800,channels:3,background:'#6b1c29'}}).png().toBuffer();
   await page.getByTestId('custom-upload-one').setInputFiles({name:'replacement-one-artwork.png',mimeType:'image/png',buffer:replacement});
   await page.waitForFunction(()=>window.__staffArtworkReadWaiting===true);await page.waitForFunction(()=>document.querySelector('[data-testid="staff-start-event"]')?.textContent.includes('Preparing artwork'));
   await page.getByTestId('staff-custom-done').click();assert(!await page.getByTestId('staff-custom-dialog').isVisible());
   assert(await page.getByTestId('staff-start-event').isDisabled(),'closing Custom cannot start with the previous artwork while a replacement is preparing');assert((await page.getByTestId('staff-start-event').textContent()).includes('Preparing artwork'),'preparing status remains clear after closing the editor');
   assert.equal(await previewSvg(page,'one'),previousOne,'pending artwork does not silently replace the selected print');
   await page.evaluate(()=>window.__releaseStaffArtworkRead());await page.waitForFunction(()=>!document.querySelector('[data-testid="staff-start-event"]').disabled);await readyProofs(page);
   assert.notEqual(await previewSvg(page,'one'),previousOne,'the completed replacement appears in the actual one-photo print');assert.equal(await previewSvg(page,'four'),previousFour,'replacing one-photo artwork preserves the four-photo artwork');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/'+engine+'-custom-ready-phone.png',fullPage:true});await page.setViewportSize({width:1024,height:768});
}
async function compactSetupProof(page,engine){
 const layouts=['fpr-graduation','fpr-wedding','fpr-birthday','fpr-quince','fpr-corporate','custom'],geometry=[];
 for(const [label,width,height]of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844]]){
  await page.setViewportSize({width,height});await resetSetupScroll(page);await readyProofs(page);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),label+' has no horizontal page overflow');
  await visibleInViewport(page,page.getByTestId('staff-event-select'),label+' event picker');
  await visibleInViewport(page,page.getByTestId('staff-start-event'),label+' primary Start photo booth button');
  for(const id of layouts){
   const card=page.getByTestId('staff-layout-'+id);
   if(width>=768)await visibleInViewport(page,card,label+' '+id+' choice');
   else{await card.scrollIntoViewIfNeeded();await visibleInViewport(page,card,label+' reachable '+id+' choice');await visibleInViewport(page,page.getByTestId('staff-start-event'),label+' start remains visible while choosing');}
  }
  await resetSetupScroll(page);
  for(const [kind,count]of [['one',1],['four',4]]){
   const toggle=page.getByTestId('staff-preview-'+kind);await toggle.scrollIntoViewIfNeeded();await toggle.click();await readyProofs(page);
   assert((await toggle.boundingBox())?.height>=44,label+' preview switch is large enough to tap');
   assert.equal(await toggle.getAttribute('aria-pressed'),'true',label+' preview toggle is selected');
   assert(await page.getByTestId('staff-layout-preview-'+kind).isVisible(),label+' selected print preview is visible');
   if(width>=768)await visibleInViewport(page,page.getByTestId('staff-layout-preview-'+kind),label+' complete print preview');
   assert(!await page.getByTestId('staff-layout-preview-'+(kind==='one'?'four':'one')).isVisible(),label+' shows exactly one print image');
   assert.equal(await page.getByTestId('staff-print-preview').getAttribute('data-selected-photos'),String(count));
   await visibleInViewport(page,page.getByTestId('staff-start-event'),label+' start stays visible after preview change');
  }
  await resetSetupScroll(page);await page.screenshot({path:out+'/'+engine+'-compact-'+label+'.png'});
  if(width<768){
   if(engine==='webkit'){await page.getByTestId('staff-layout-fpr-wedding').focus();await page.keyboard.press('PageDown');}
   else{await page.mouse.move(width/2,Math.min(500,height/2));await page.mouse.wheel(0,650);}
   await page.waitForFunction(()=>{const main=document.querySelector('.staffStartPage'),image=document.querySelector('[data-testid="staff-layout-preview-four"]'),box=image?.getBoundingClientRect();return main?.scrollTop>100&&box&&box.top>=0&&box.bottom<=innerHeight;});
   await visibleInViewport(page,page.getByTestId('staff-layout-preview-four'),label+' print preview reached by ordinary scrolling');await visibleInViewport(page,page.getByTestId('staff-start-event'),label+' Start stays visible while scrolling');
   await page.screenshot({path:out+'/'+engine+'-compact-'+label+'-scrolled-preview.png'});if(engine==='webkit')await pageUpToStart(page);else await page.mouse.wheel(0,-2000);await page.waitForFunction(()=>document.querySelector('.staffStartPage')?.scrollTop===0);await visibleInViewport(page,page.getByTestId('staff-event-select'),label+' event picker reached by scrolling back');await visibleInViewport(page,page.getByTestId('staff-start-event'),label+' Start stays visible after scrolling back');
  }
  geometry.push({label,width,height,noHorizontalOverflow:true,allChoicesReachable:true,primaryStartInViewport:true,oneVisiblePrintPreview:true,...(width<768?{ordinaryScrollingWorks:true,scrollMethod:engine==='webkit'?'keyboard':'wheel'}:{})});
 }
 await page.setViewportSize({width:1024,height:768});await resetSetupScroll(page);
 // Changing choices changes the actual rendered artwork without saving or starting.
 const sources=new Set();
 for(const id of layouts.filter(id=>id!=='custom')){
  await page.getByTestId('staff-layout-'+id).click();await readyProofs(page);
  assert.equal(await page.getByTestId('staff-print-preview').getAttribute('data-template'),id);
  assert.equal(await page.getByTestId('staff-layout-'+id).getAttribute('aria-pressed'),'true');
  sources.add(await previewSvg(page,'one'));
 }
 assert.equal(sources.size,5,'the five choices render five different print designs');
 // Printed name updates the finished artwork preview while its controls are optional.
 await page.getByTestId('staff-layout-fpr-wedding').click();
 const nameToggle=page.getByTestId('staff-printed-name-edit');await nameToggle.click();
 await page.waitForFunction(()=>document.querySelector('[data-testid="staff-print-details"]')?.open&&document.querySelector('[data-testid="staff-start-event"]')?.disabled);
 assert(await page.getByTestId('staff-start-event').isDisabled(),'Start is disabled while printed-name editing is open');
 await page.locator('#staff-print-name').fill('Preview Name Proof');
 await page.locator('#staff-print-name').press('Enter');assert.equal(new URL(page.url()).pathname,'/staff/start','Enter in the printed name does not start the booth');assert(await page.locator('#staff-print-name').isVisible(),'Enter leaves name editing open');
 for(const kind of ['one','four'])assert((await previewSvg(page,kind)).includes('Preview Name Proof'),'edited print name is in the '+kind+' print artwork');
 await page.locator('#staff-print-name').fill('Test Couple');await page.getByTestId('staff-print-name-done').click();
 assert(!await page.locator('#staff-print-name').isVisible(),'printed name controls close when finished');
 // Custom opens on demand, traps keyboard focus and restores it after closing.
 const customCard=page.getByTestId('staff-layout-custom');await customCard.click();
 const dialog=page.getByTestId('staff-custom-dialog');await dialog.waitFor();assert.equal(await page.getByRole('dialog',{name:'Custom layout',exact:true}).count(),1,'custom dialog has an accessible name');
 assert(await page.getByTestId('staff-start-event').isDisabled(),'Start is disabled while editing Custom');
 await page.getByTestId('custom-heading').press('Enter');assert(await dialog.isVisible(),'Enter in the Custom name keeps the editor open');assert.equal(new URL(page.url()).pathname,'/staff/start','Enter in Custom cannot activate an event');
 for(let step=0;step<8;step++){await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,testId:document.activeElement?.getAttribute('data-testid')}));assert(await dialog.evaluate(node=>node.contains(document.activeElement)),'custom editor keeps keyboard focus inside the dialog at Tab '+(step+1)+': '+JSON.stringify(focus));}
 const close=page.getByRole('button',{name:'Close custom layout editor',exact:true});await close.focus();await page.keyboard.press('Shift+Tab');assert(await page.getByTestId('staff-custom-done').evaluate(node=>node===document.activeElement),'Shift+Tab wraps to the last custom control');await page.keyboard.press('Tab');assert(await close.evaluate(node=>node===document.activeElement),'Tab wraps to the first custom control');
 await page.keyboard.press('Escape');assert(!await dialog.isVisible(),'Escape closes custom editor');
 assert(await customCard.evaluate(node=>node===document.activeElement),'closing custom returns focus to its card');
 const edit=page.getByTestId('staff-custom-edit');await edit.click();await dialog.waitFor();await page.getByTestId('staff-custom-done').click();
 assert(!await dialog.isVisible(),'Done editing returns to layout selection');assert(await edit.evaluate(node=>node===document.activeElement),'Done editing returns focus to its trigger');
 await artworkReplacementProof(page,engine);
 await page.getByTestId('staff-layout-fpr-wedding').click();await readyProofs(page);await page.getByTestId('staff-preview-one').click();
 return geometry;
}
let ready=false;for(let n=0;n<60;n++){try{if((await fetch(base+'/api/app-version',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert(ready,'Local booth server did not start');
try{
 for(const [engine,api]of engines){
  const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
  const errors=[],pageErrorDetails=[],requestFailures=[],boundaryErrors=[],writes=[],saved=new Map();let unlocked=false,payload={...initialPayload},startFault='conflict',origin,phase='staff-sign-in';
  const server=createServer(async(request,response)=>{
   const reply=(status,data)=>{response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});response.end(JSON.stringify(data));};
   try{
    const url=new URL(request.url,origin),path=url.pathname;
    if(path==='/api/staff/unlock'&&request.method==='GET')return reply(200,{required:true,configured:true,missing:[]});
    if(path==='/api/staff/events'&&request.method==='GET')return unlocked?reply(200,{events:[{id:eventId,title:payload.title,date:payload.date,eventType:'Wedding',revision:payload.rev,design:payload.design},{id:otherId,title:'Other event',date:'2026-10-11',eventType:'Party',revision:payload.rev,design:'fpr-birthday'}]}):reply(401,{error:'Enter the staff PIN to choose an event.'});
    if(path==='/api/staff/events/'+eventId&&request.method==='GET'){
     const authorized=request.headers.authorization==='Bearer '+token;
     if(!unlocked&&!authorized)return reply(401,{error:'Enter the staff PIN.'});
     return reply(200,{payload,...(unlocked?{token}:{})});
    }
    if(['GET','HEAD'].includes(request.method)){
     const upstream=new URL(base);upstream.pathname=url.pathname;upstream.search=url.search;
     const forward=httpRequest(upstream,{method:request.method,headers:{...request.headers,host:upstream.host}},incoming=>{response.writeHead(incoming.statusCode,incoming.headers);incoming.pipe(response);});
     forward.on('error',error=>{boundaryErrors.push(error.message);if(!response.headersSent)reply(502,{error:'Local server unavailable'});else response.destroy();});request.pipe(forward);return;
    }
    const chunks=[];for await(const chunk of request)chunks.push(chunk);const body=Buffer.concat(chunks);
    writes.push({path,method:request.method});
    if(path==='/api/staff/unlock'&&request.method==='POST'){assert.deepEqual(JSON.parse(body),{pin:'2018'});unlocked=true;return reply(200,{ok:true});}
    if(path==='/api/staff/lock'&&request.method==='POST'){unlocked=false;return reply(200,{ok:true});}
    if(path==='/api/staff/events/'+eventId&&request.method==='POST'){
     assert(unlocked,'only unlocked staff can change the design');const changes=JSON.parse(body);
     assert.equal(changes.revision,payload.rev);assert(['fpr-graduation','fpr-wedding','fpr-birthday','fpr-quince','fpr-corporate','custom'].includes(changes.design));
     if(startFault==='conflict'){startFault='wrong-event';return reply(409,{error:'This event changed in another window. Refresh its preview and try again.'});}
     if(startFault==='wrong-event'){startFault=null;return reply(200,{payload:{...payload,id:otherId,title:'Wrong event'},token});}
     payload=validateBoothHandoff({...payload,rev:new Date(Date.parse(payload.rev)+1000).toISOString(),design:changes.design,...(changes.customDesign?{customDesign:validateCustomDesign(changes.customDesign)}:{}),...(changes.nameOnPrint!==undefined?{name:changes.nameOnPrint}:{}),...(changes.classYear!==undefined?{year:changes.classYear}:{})});
     return reply(200,{payload,token});
    }
    if(path==='/api/backup/image'&&request.method==='POST'){
     assert.equal(request.headers.authorization,'Bearer '+token);assert.equal(request.headers['x-booth-event'],eventId);
     const kind=request.headers['x-booth-kind'];assert.match(kind,/^(pose-[1-4]|collage|keepsake)$/);assert(body.length>0&&body[0]===255&&body[1]===216&&body.at(-2)===255&&body.at(-1)===217,'backup contains a whole JPEG');
     const key=request.headers['x-booth-capture']+'/'+kind,prior=saved.get(key);if(prior)assert.deepEqual(prior,body,'retry keeps exact bytes');saved.set(key,Buffer.from(body));return reply(200,{ok:true});
    }
    throw new Error('Unexpected write: '+request.method+' '+path);
   }catch(error){boundaryErrors.push(error.message);return reply(500,{error:'Fixture rejected request'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(['data:','blob:'].includes(url.protocol))return route.continue();return url.origin===origin?route.continue():route.abort();});
  await context.addInitScript(({scope,other,oldConfig,otherConfig,otherId,activeKey})=>{
   if(!localStorage.getItem('__staffStartSeeded')){
    localStorage.setItem(scope.config,JSON.stringify(oldConfig));localStorage.setItem(scope.usage,'17');localStorage.setItem(other.config,JSON.stringify(otherConfig));localStorage.setItem(other.usage,'29');localStorage.setItem(other.photos,'other-event-recent-sentinel');localStorage.setItem(activeKey,otherId);localStorage.setItem('__staffStartSeeded','true');
   }
   window.__staffStartPrints=0;window.__staffStartShares=0;
   window.print=()=>{window.__staffStartPrints++;throw new Error('This proof must not print');};
   Object.defineProperty(navigator,'share',{configurable:true,value:()=>{window.__staffStartShares++;throw new Error('This proof must not send');}});
   Object.defineProperty(window,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('Use visual countdown');}}});Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{
    assertNoAudio(options);const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');let frame=0;
    const draw=()=>{frame++;ctx.fillStyle=['#173c57','#693750','#315d46'][Math.floor(frame/8)%3];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff';ctx.font='bold 60px sans-serif';ctx.fillText('STAFF POSE '+frame,45,250);};draw();const stream=canvas.captureStream(20),timer=setInterval(draw,70),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};return stream;
   }}});
   function assertNoAudio(options){if(options.audio!==false)throw new Error('Camera unexpectedly requested microphone');}
  },{scope,other,oldConfig,otherConfig,otherId,activeKey:ACTIVE_EVENT_KEY});
  const page=await context.newPage();page.__proofEngine=engine;page.setDefaultTimeout(20000);page.on('pageerror',error=>{errors.push(error.message);pageErrorDetails.push({phase,message:error.message,stack:error.stack});});page.on('requestfailed',request=>requestFailures.push({phase,url:request.url(),error:request.failure()?.errorText}));
  try{
   await page.goto(origin+'/staff/start?event='+eventId,{waitUntil:'networkidle'});
   await page.getByTestId('staff-start-pin').waitFor();assert.equal(await page.getByTestId('staff-event-select').count(),0,'guest cannot list customer events');
   const before=await page.evaluate(({scope,other,activeKey})=>Object.fromEntries([scope.config,scope.usage,other.config,other.usage,other.photos,activeKey].map(key=>[key,localStorage.getItem(key)])),{scope,other,activeKey:ACTIVE_EVENT_KEY});
   await page.evaluate(async({source,target})=>{const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {savePose};')();const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8;await api.savePose(target,'other-event-original',1,canvas.toDataURL('image/jpeg'),{title:'Untouched original'});},{source:archiveSource,target:other.archive});
   const otherArchiveBefore=await archive(page,other.archive);
   await pin(page);
   await page.waitForFunction(id=>document.querySelector('[data-testid="staff-event-select"]')?.value===id,eventId);
   await page.getByTestId('staff-start-event').waitFor();
   assert.equal(await page.getByTestId('staff-event-select').inputValue(),eventId,'owner link selects only the intended booking');
   for(const id of ['fpr-graduation','fpr-wedding','fpr-birthday','fpr-quince','fpr-corporate','custom'])assert(await page.getByTestId('staff-layout-'+id).isVisible());
   assert.equal(await page.locator('[data-testid^="staff-layout-fpr-"]').count(),5);await readyProofs(page);
   for(const id of ['fpr-graduation','fpr-wedding','fpr-birthday','fpr-quince','fpr-corporate']){
    const card=page.getByTestId('staff-layout-'+id);await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(id=>{const image=document.querySelector('[data-testid="staff-layout-'+id+'"] img');return image?.complete&&image.naturalWidth>0;},id);
   }
   await page.getByRole('heading',{name:'Start photo booth',exact:true}).scrollIntoViewIfNeeded();
   assert.equal(await page.getByTestId('staff-layout-fpr-wedding').getAttribute('aria-pressed'),'true');
   phase='compact-layout-and-focus';const writesBeforeChoices=writes.length;
   const compactGeometry=await compactSetupProof(page,engine);
   assert.equal(writes.length,writesBeforeChoices,'preview choices and custom editing do not write to a customer event');
   assert.deepEqual(await archive(page),[],'setup samples never save a guest photo');
   console.log(engine+': all four compact viewport checks, dialog/name keyboard safety and delayed artwork replacement passed; starting capture and backup verification.');
   await page.getByTestId('staff-start-event').click();await page.getByText('This event changed in another window.',{exact:false}).waitFor();
   assert.equal(new URL(page.url()).pathname,'/staff/start');
   assert(await page.getByTestId('staff-start-event').isDisabled(),'stale revision requires a fresh preview');
   await page.getByRole('button',{name:'Refresh this event',exact:true}).click();
   await page.getByTestId('staff-start-event').waitFor();
   await page.getByTestId('staff-start-event').click();await page.getByText('This response belongs to a different event.',{exact:false}).waitFor();
   const afterFailure=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(before));assert.deepEqual(afterFailure,before,'conflict and wrong-event response cannot activate or overwrite any event');
   await page.getByTestId('staff-start-event').click();await page.waitForURL(origin+scope.home);await page.getByTestId('welcome-four-photo').waitFor();await page.waitForLoadState('networkidle');
   const configured=await page.evaluate(({scope,tokenKey,activeKey})=>({config:JSON.parse(localStorage.getItem(scope.config)),used:localStorage.getItem(scope.usage),token:localStorage.getItem(tokenKey),active:localStorage.getItem(activeKey)}),{scope,tokenKey:tokenKey(eventId),activeKey:ACTIVE_EVENT_KEY});
   assert.equal(configured.config.defaultTemplate,'fpr-wedding');assert.equal(configured.config.guestMode,'approved');assert.equal(configured.config.adminHandoff.source,'staff');assert.equal(configured.config.adminHandoff.syncTicket,null,'direct start clears an earlier owner handoff proof');assert.equal(configured.config.staffNote,oldConfig.staffNote);assert.equal(configured.used,'17');assert.equal(configured.token,token);assert.equal(configured.active,eventId);assert.equal(unlocked,false,'start locks staff session before guest use');
   assert.equal(await page.getByTestId('booth-handoff-apply').count(),0,'no transfer/apply confirmation');
   phase='preset-one-photo';const one=await capture(page,1,'fpr-wedding');await waitSaved(page,3);const rowsOne=await archive(page);assert.deepEqual(Buffer.from(rowsOne[0].keepsake),one);
   await done(page);phase='preset-four-photo';await capture(page,4,'fpr-wedding');await waitSaved(page,9);await done(page);
   // Reopening the app remembers this event; nobody repeats a handoff.
   await page.goto(origin+'/',{waitUntil:'networkidle'});await page.waitForURL(origin+scope.home);await page.getByTestId('welcome-four-photo').waitFor();
   phase='custom-build-start';await openStaff(page,origin);await page.getByTestId('staff-layout-custom').click();await page.getByTestId('staff-custom-dialog').waitFor();await page.getByTestId('custom-heading').fill('Custom Staff Celebration');await page.getByTestId('custom-footer').fill('Prepared before guests arrive');await page.getByTestId('staff-custom-done').click();await readyProofs(page);
   await page.getByTestId('staff-start-event').click();await page.waitForURL(origin+scope.home);await page.getByTestId('welcome-quick-photo').waitFor();assert.equal(payload.customDesign.mode,'build');assert.equal(payload.customDesign.heading,'Custom Staff Celebration');
   phase='custom-build-one-photo';await capture(page,1,'custom');await waitSaved(page,12);await done(page);
   phase='custom-upload-start';await openStaff(page,origin);await page.getByTestId('staff-layout-custom').click();await page.getByTestId('staff-custom-dialog').waitFor();await page.getByRole('radio',{name:'Upload artwork',exact:true}).check();
   for(const [kind,color]of [['one','#173657'],['four','#392647']]){
    const png=await sharp({create:{width:1200,height:1800,channels:3,background:color}}).png().toBuffer();
    await page.getByTestId('custom-upload-'+kind).setInputFiles({name:kind+'-artwork.png',mimeType:'image/png',buffer:png});
    await page.getByTestId('custom-upload-'+kind).locator('..').getByRole('status').filter({hasText:'Artwork ready'}).waitFor();
    if(kind==='one')assert(await page.getByTestId('staff-start-event').isDisabled(),'one uploaded background cannot start both photo layouts');
   }
   await readyProofs(page);assert(await page.getByTestId('staff-start-event').isDisabled(),'the booth cannot start while the artwork editor is open');
   await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'custom page fits a phone');await page.screenshot({path:out+'/'+engine+'-custom-upload-phone.png',fullPage:true});await page.getByTestId('staff-custom-done').click();assert(!await page.getByTestId('staff-custom-dialog').isVisible(),'custom uploads return to the single print preview');await page.waitForFunction(()=>!document.querySelector('[data-testid="staff-start-event"]').disabled);await page.setViewportSize({width:1024,height:768});
   await page.getByTestId('staff-start-event').click();await page.waitForURL(origin+scope.home);await page.getByTestId('welcome-quick-photo').waitFor();assert.equal(payload.customDesign.mode,'upload');assert(payload.customDesign.layouts.one.image&&payload.customDesign.layouts.four.image);assert.notEqual(payload.customDesign.layouts.one.image,payload.customDesign.layouts.four.image);
   phase='custom-upload-one-photo';await capture(page,1,'custom');await waitSaved(page,15);
   const rows=await archive(page);assert.equal(rows.length,4);assert.equal(rows[1].poses.length,4);assert.equal(saved.size,15);
   for(const row of rows){for(const [kind,bytes]of [...row.poses.map((bytes,i)=>['pose-'+(i+1),bytes]),['collage',row.collage],['keepsake',row.keepsake]])if(bytes)assert.deepEqual(saved.get(row.id+'/'+kind),Buffer.from(bytes),'backend received exact archived '+kind);}
   const after=await page.evaluate(({scope,other})=>({usage:localStorage.getItem(scope.usage),other:Object.fromEntries([other.config,other.usage,other.photos].map(key=>[key,localStorage.getItem(key)])),prints:window.__staffStartPrints,shares:window.__staffStartShares}),{scope,other});assert.equal(after.usage,'17');for(const [key,value]of Object.entries(after.other))assert.equal(value,before[key]);assert.deepEqual(await archive(page,other.archive),otherArchiveBefore,'other-event original remains byte-identical');assert.equal(after.prints,0);assert.equal(after.shares,0);
   assert(!writes.some(write=>write.path==='/api/backup/authorize'),'Start event authorizes automatic backup without an owner handoff');assert.deepEqual(boundaryErrors,[]);assert.deepEqual(errors,[]);
   results.push({engine,passed:true,pinProtected:true,compactGeometry,customKeyboardFocus:true,printedNameInArtwork:true,artworkReplacementWaits:true,conflictAndWrongEventSafe:true,presetSessions:[1,4],customBuildAndUpload:true,automaticBackendFiles:saved.size,otherEventUntouched:true,noOwnerHandoff:true,noPrintsOrMessages:true});console.log(engine+': compact staff start across desktop/iPad/phone, custom layouts, original/finished backup and event isolation passed.');
  }catch(error){results.push({engine,passed:false,error:error.message,stack:error.stack,errors,pageErrorDetails,requestFailures,boundaryErrors,writes,saved:saved.size});await page.screenshot({path:out+'/'+engine+'-failure.png',fullPage:true}).catch(()=>{});throw error;}
  finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
 }
}finally{await writeFile(out+'/results.json',JSON.stringify({base,results},null,2));}
