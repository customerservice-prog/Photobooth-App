import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer as createHttpsServer} from 'node:https';
import {request as httpRequest} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {workspace,octoberPreset} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {tokenKey,backupStatusKey} from '../app/lib/backup-sync.mjs';
import {STAFF_COOKIE,makeStaffSession} from '../app/lib/staff-auth.mjs';
import {FPR_PRINT_PRESETS} from '../app/lib/fpr-print-presets.mjs';
import {guestEventConfig} from '../app/lib/guest-design.mjs';
import {normalizeEventConfig,eventMonogram} from '../app/lib/event-config.mjs';
import {createCustomDesign,validateCustomDesign} from '../app/lib/custom-design.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {assertFullSheetPresetArtwork,assertUploadedArtworkEdges} from './assert-full-sheet-artwork.mjs';

// This exercises the real, PIN-protected page and actual browser JPEG exporter.
// Every event, archive and staff cookie is an isolated local fixture. The print
// dialog is stubbed: this script never contacts a real printer or customer.
const upstream=(process.env.EVENT_PRINT_REHEARSAL_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
assert(new URL(upstream).protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(new URL(upstream).hostname),'Printer rehearsal fixtures require a local HTTP server');
const tlsPort=Number(process.env.EVENT_PRINT_REHEARSAL_TLS_PORT||3418),base='https://127.0.0.1:'+tlsPort,origin=base;
const secret=process.env.BOOTH_STAFF_SESSION_SECRET;
assert(secret?.length>=32,'Set a local fixture BOOTH_STAFF_SESSION_SECRET for the server and proof');
const staffSession=await makeStaffSession(secret);
const engines=process.env.EVENT_PRINT_REHEARSAL_CHROMIUM_ONLY==='1'?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const out='event-print-rehearsal-proof',results=[];
await mkdir(out,{recursive:true});
const tlsDirectory=await mkdtemp(join(tmpdir(),'friendly-print-rehearsal-tls-')),keyFile=join(tlsDirectory,'key.pem'),certFile=join(tlsDirectory,'cert.pem');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-sha256','-nodes','-keyout',keyFile,'-out',certFile,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],{stdio:'ignore'});
const proxy=createHttpsServer({key:await readFile(keyFile),cert:await readFile(certFile)},(request,response)=>{
 const destination=new URL(upstream),upstreamRequest=httpRequest({hostname:destination.hostname,port:destination.port,path:request.url,method:request.method,headers:{...request.headers,'x-forwarded-proto':'https'}},result=>{response.writeHead(result.statusCode,result.headers);result.pipe(response);});
 upstreamRequest.on('error',()=>{response.writeHead(502);response.end();});request.pipe(upstreamRequest);
});
await new Promise((resolve,reject)=>{proxy.once('error',reject);proxy.listen(tlsPort,'127.0.0.1',resolve);});
const exportSource=await readFile(new URL('../app/lib/keepsake-export.mjs',import.meta.url),'utf8');
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const eventId='approved-print-rehearsal-fixture',otherId='approved-print-untouched-fixture';
const scope=workspace('?booth_event='+eventId),other=workspace('?booth_event='+otherId);
const fixtureJpeg='data:image/jpeg;base64,'+(await sharp({create:{width:32,height:32,channels:3,background:'#527063'}}).jpeg().toBuffer()).toString('base64');
const kinds={graduation:'graduation',wedding:'wedding',birthday:'birthday',quince:'other',corporate:'corporate'};
function fixtureConfig(design,type='corporate'){
 return {...octoberPreset(),eventId,type,title:'Approved Print Fixture',approvedPrintName:'Customer Print Name',date:'October 10, 2026',guestMode:'approved',defaultTemplate:design,photoFit:'fill',details:{eventName:'Customer Print Name',classYear:'2026'},staffNote:'Keep booking fields and print allowance',printPackage:{includedPrints:108,addOnPrints:54,shotsPerSession:4,copiesPerSession:1,printingEnabled:true,digitalEnabled:true}};
}
const cases=FPR_PRINT_PRESETS.map(preset=>({name:preset.key,family:preset.key,preset:preset.key,config:fixtureConfig(preset.id,kinds[preset.key])}));
const build=createCustomDesign('build');build.heading='Approved Custom Heading';build.footer='Customer approved footer';
cases.push({name:'custom-build',family:'corporate',config:{...fixtureConfig('custom'),customDesign:validateCustomDesign(build)}});
const upload=createCustomDesign('upload');
for(const [kind,color,width,height]of [['one','#234d62',720,1800],['four','#653053',1800,720]])upload.layouts[kind].image='data:image/png;base64,'+(await sharp({create:{width,height,channels:3,background:color}}).png().toBuffer()).toString('base64');
cases.push({name:'custom-upload',family:'corporate',config:{...fixtureConfig('custom'),customDesign:validateCustomDesign(upload)}});

async function snapshot(page){
 return page.evaluate(async({source})=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {openArchive};')(),db=await api.openArchive();
  try{
   const records=await new Promise((resolve,reject)=>{const tx=db.transaction('captures','readonly'),request=tx.objectStore('captures').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
   const bytes=value=>value?Array.from(new Uint8Array(value)):null;
   return {storage:Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)])),archive:records.map(row=>({...row,poses:row.poses.map(bytes),collage:bytes(row.collage),keepsake:bytes(row.keepsake)})).sort((a,b)=>a.key.localeCompare(b.key))};
  }finally{db.close();}
 },{source:archiveSource});
}
async function seededPage(browser,test){
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block',ignoreHTTPSErrors:true}),writes=[],externalRequests=[],syncReads=[],errors=[];
 await context.addCookies([{name:STAFF_COOKIE,value:staffSession,url:base+'/',secure:true,httpOnly:true,sameSite:'Strict'}]);
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method())){writes.push({method:request.method(),path:url.pathname});return route.abort();}
  if(url.origin!==origin){externalRequests.push(url.origin+url.pathname);return route.abort();}
  if(/^\/api\/(staff\/events|booth\/)/.test(url.pathname))syncReads.push(url.pathname);
  return route.continue();
 });
 await context.addInitScript(()=>{
  window.__rehearsalPrints=0;window.__rehearsalShares=0;window.__rehearsalCameras=0;
  window.print=()=>{window.__rehearsalPrints++;window.dispatchEvent(new Event('afterprint'));};
  Object.defineProperty(navigator,'share',{configurable:true,value:()=>{window.__rehearsalShares++;throw new Error('Rehearsal must not send customer messages');}});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__rehearsalCameras++;throw new Error('Printer rehearsal must not open the camera');}}});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/api/app-version');
 const release=JSON.parse(await page.locator('body').textContent());assert.equal(release.version,BOOTH_RELEASE);
 await page.evaluate(async({scope,other,config,activeKey,source,jpeg})=>{
  localStorage.setItem(scope.config,JSON.stringify(config));localStorage.setItem(scope.usage,'23');localStorage.setItem(scope.photos,'[]');
  localStorage.setItem(other.config,JSON.stringify({...config,eventId:other.id,title:'Other Customer Event',approvedPrintName:'Other Customer'}));localStorage.setItem(other.usage,'41');localStorage.setItem(other.photos,'[]');localStorage.setItem(activeKey,scope.id);
  localStorage.setItem('friendly-booth-screen-awake-v1','off');localStorage.setItem('shared-staff-setting','keep this setting');
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture,saveKeepsake};')();
  for(const target of [scope,other]){await api.saveCapture(target.archive,'existing-customer-photo',jpeg,[jpeg],config);await api.saveKeepsake(target.archive,'existing-customer-photo',new Blob([Uint8Array.from(atob(jpeg.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/jpeg'}));}
 },{scope,other,config:test.config,activeKey:ACTIVE_EVENT_KEY,source:archiveSource,jpeg:fixtureJpeg});
 return {page,context,writes,externalRequests,syncReads,errors,before:await snapshot(page)};
}

// Independently reconstruct the four locally bundled examples. They are never
// archived. Comparing complete JPEG bytes proves the page uses exactly these
// four ordered originals in the chosen guest renderer, not an old sample card.
async function examplePoses(page,family){
 return page.evaluate(async family=>{
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='/images/welcome-poses/'+family+'-sprite.jpg';});
  const width=image.naturalWidth/4,poses=[];
  for(let pose=0;pose<4;pose++){
   const canvas=document.createElement('canvas');canvas.width=420;canvas.height=260;const ctx=canvas.getContext('2d');
   ctx.drawImage(image,pose*width,0,width,image.naturalHeight,0,0,420,260);poses.push(canvas.toDataURL('image/jpeg',.80));canvas.width=0;canvas.height=0;
  }
  return poses;
 },family);
}
async function actualExport(page,svg,count){
 return Buffer.from(await page.evaluate(async({svg,source,count})=>{
  const api=new Function('renderKeepsake',source.replace(/^import .*;\n/,'').replace(/\bexport /g,'')+'\nreturn {makeKeepsakeExport};')(()=>svg);
  const artifact=await api.makeKeepsakeExport({photo:'data:image/jpeg;base64,/9j/2Q==',layout:count===1?'card':'photo_strip',cfg:{title:'Approved Print Fixture'}});
  return Array.from(new Uint8Array(await artifact.blob.arrayBuffer()));
 },{svg,source:exportSource,count}));
}
async function orderedOpenings(page,svg,count,test){
 const info=await page.evaluate(svg=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement;
  return {viewBox:root.getAttribute('viewBox'),preset:root.getAttribute('data-fpr-preset'),customMode:root.getAttribute('data-custom-mode'),images:[...root.querySelectorAll('image[data-guest-photo="true"]')].map(image=>({pose:Number(image.getAttribute('data-pose')),src:image.getAttribute('href'),x:Number(image.getAttribute('x')),y:Number(image.getAttribute('y')),width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))}))};
 },svg);
 assert.equal(info.viewBox,'0 0 1200 1800');assert.equal(info.images.length,count);
 assert.deepEqual(info.images.map(image=>image.pose),Array.from({length:count},(_,i)=>i+1),'all poses are ordered exactly once');
 assert.equal(new Set(info.images.map(image=>image.src)).size,count,'all four sample photos are distinct');
 if(test.preset)assert.equal(info.preset,test.preset,'chosen approved artwork remains selected');
 else assert.equal(info.customMode,test.config.customDesign.mode,'the selected custom artwork is used');
 for(let i=0;i<count;i++){
  const a=info.images[i];assert(a.width>100&&a.height>100&&a.x>=0&&a.y>=0&&a.x+a.width<=1200.02&&a.y+a.height<=1800.02,'each real photo has a substantial bounded opening');
  for(let j=i+1;j<count;j++){const b=info.images[j];assert(a.x+a.width<=b.x+.02||b.x+b.width<=a.x+.02||a.y+a.height<=b.y+.02||b.y+b.height<=a.y+.02,'photo openings do not overlap');}
 }
 return {...info,images:info.images.map(({src,...image})=>image)};
}
async function printGeometry(page,expectedSrc){
 await page.emulateMedia({media:'print'});
 const info=await page.evaluate(()=>{
  const visible=node=>{const box=node.getBoundingClientRect();return getComputedStyle(node).visibility!=='hidden'&&box.width>0&&box.height>0;};
  const images=[...document.images].filter(visible),svgs=[...document.querySelectorAll('svg')].filter(visible);
  return {images:images.map(image=>{const b=image.getBoundingClientRect();return {src:image.getAttribute('src'),x:b.x,y:b.y,width:b.width,height:b.height,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};}),visibleSVGs:svgs.length,visibleButtons:[...document.querySelectorAll('button')].filter(visible).length,bodyHeight:document.body.scrollHeight,pages:[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].filter(rule=>rule.type===CSSRule.PAGE_RULE).map(rule=>rule.cssText);}catch{return [];}})};
 });
 assert.equal(info.images.length,1,'print media has exactly one finished JPEG, never the preview and SVG together');
 assert.equal(info.images[0].src,expectedSrc,'physical-print image uses the exact displayed approved JPEG');
 assert.equal(info.images[0].naturalWidth,1200);assert.equal(info.images[0].naturalHeight,1800);
 assert(Math.abs(info.images[0].x)<.1&&Math.abs(info.images[0].y)<.1&&Math.abs(info.images[0].width-384)<.1&&Math.abs(info.images[0].height-576)<.1,'one image fills precisely one 4×6 inch sheet at the CSS 96dpi scale');
 assert.equal(info.visibleSVGs,0);assert.equal(info.visibleButtons,0);assert(info.bodyHeight<=577,'print UI cannot create another sheet');
 assert(info.pages.some(rule=>/size:\s*4in 6in/.test(rule)&&/margin:\s*0/.test(rule)),'print page requests postcard size with no margin');
 await page.emulateMedia({media:'screen'});
 return {...info,images:info.images.map(({src,...image})=>image)};
}

async function rehearsalCase(browser,engine,test){
 const fixture=await seededPage(browser,test),{page,context,writes,externalRequests,errors,before}=fixture,label=engine+'-'+test.name,layouts={};
 try{
  await page.goto(base+'/print-test?booth_event='+eventId,{waitUntil:'networkidle'});
  await page.getByTestId('print-test-preview').waitFor();
  assert((await page.getByTestId('print-test-event').textContent()).includes(test.config.title));
  assert.equal(await page.locator('select').count(),0,'there is no legacy artwork chooser');assert.equal(await page.getByRole('link',{name:'Compare sample designs',exact:true}).count(),0,'printer rehearsal cannot lead guests to another design gallery');
  const poses=await examplePoses(page,test.family);
  for(const count of [1,4]){
   const choice=page.getByTestId(count===1?'print-test-one':'print-test-four');await choice.click();
   await page.waitForFunction(()=>document.querySelector('[data-testid="print-test-preview"]')?.complete&&document.querySelector('[data-testid="print-test-preview"]')?.naturalWidth===1200&&!document.querySelector('[data-testid="print-test-print"]')?.disabled);
   assert.equal(await choice.getAttribute('aria-pressed'),'true');assert((await choice.boundingBox()).height>=44,'layout choice is large enough for an iPad tap');
   assert.equal(await page.locator('input[type="checkbox"]:checked').count(),0,'switching layouts clears the previous physical-sheet checks');
   const source=await page.getByTestId('print-test-preview').getAttribute('src');assert(source.startsWith('data:image/jpeg;base64,'),'the preview is an actual finished JPEG');
   assert.equal(await page.getByTestId('print-test-sheet').getAttribute('src'),source,'screen and print always use the same image');
   const bytes=Buffer.from(source.split(',')[1],'base64'),meta=await sharp(bytes).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,1800);
   const fullSheetArtwork=test.preset?await assertFullSheetPresetArtwork(bytes,label+' '+count+' rehearsal JPEG'):
    test.name==='custom-upload'?await assertUploadedArtworkEdges(bytes,count===1?'#234d62':'#653053',label+' '+count+' rehearsal JPEG'):null;
   const cfg=guestEventConfig(normalizeEventConfig(test.config)),svg=renderKeepsake({cfg,template:cfg.defaultTemplate,monogram:eventMonogram(cfg),photo:poses[0],poses,layout:count===1?'card':'photo_strip',stripMode:'single',filter:'none',id:'export-card'});
   const openings=await orderedOpenings(page,svg,count,test),expected=await actualExport(page,svg,count);assert.deepEqual(bytes,expected,'actual rehearsal JPEG is byte-identical to the guest exporter with the selected event and each sample pose');
   await writeFile(`${out}/${label}-${count}-actual.jpg`,bytes);await page.screenshot({path:`${out}/${label}-${count}-screen.png`});
   const geometry=await printGeometry(page,source);await page.getByTestId('print-test-print').click();
   assert.equal(await page.evaluate(()=>window.__rehearsalPrints),count===1?1:2,'each Print tap invokes the browser once');
   assert((await page.getByTestId('print-test-status').textContent()).match(/does not confirm|not confirm|check.*paper|check.*sheet/i),'dialog closure is not reported as a physical print success');
   const checkPanel=page.locator('.ptPhysicalChecks');if(!await checkPanel.evaluate(element=>element.open))await checkPanel.locator('summary').click();
   const checks=checkPanel.locator('input[type="checkbox"]');assert.equal(await checks.count(),3,'physical review stays a short checklist');
   for(let index=0;index<3;index++)await checks.nth(index).check();
   assert((await checkPanel.textContent()).includes('You marked this sample sheet checked.'),'the checklist attributes confirmation to the staff member');
   assert.deepEqual(await snapshot(page),before,'rehearsal printing leaves customer counters, settings, original photos and finished images byte-identical');
   layouts[count]={openings,fullSheetArtwork,printGeometry:geometry};
  }
  assert.notDeepEqual(layouts[1].openings.images,layouts[4].openings.images,'one-photo and four-photo layouts are visibly different');
  // Portrait uses the same complete image and accessible controls.
  await page.setViewportSize({width:768,height:1024});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'portrait iPad has no horizontal overflow');
  await page.getByTestId('print-test-preview').scrollIntoViewIfNeeded();const portrait=await page.getByTestId('print-test-preview').boundingBox();assert(portrait&&portrait.x>=0&&portrait.y>=0&&portrait.x+portrait.width<=768.1&&portrait.y+portrait.height<=1024.1,'portrait iPad can show the entire approved sheet');await page.screenshot({path:`${out}/${label}-portrait.png`});
  assert.equal(await page.getByTestId('staff-page-back').getAttribute('href'),scope.home,'Back keeps the same customer event');await page.getByTestId('staff-page-back').click();await page.waitForURL(origin+scope.home);await page.getByTestId('welcome-quick-photo').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid="welcome-start-session"]')?.disabled);
  const afterBack=await snapshot(page),withoutBackupStatus=state=>({...state,storage:Object.fromEntries(Object.entries(state.storage).filter(([key])=>key!==backupStatusKey(eventId)))});
  assert.deepEqual(withoutBackupStatus(afterBack),withoutBackupStatus(before),'Back resumes normal backup status while preserving customer settings, counters and every archived byte');
  assert.deepEqual(writes,[],'sample preparation and printer rehearsal never upload photos or update bookings');assert.deepEqual(externalRequests,[]);assert.deepEqual(errors,[]);
  assert.deepEqual(await page.evaluate(()=>({shares:window.__rehearsalShares,cameras:window.__rehearsalCameras})),{shares:0,cameras:0});
  results.push({engine,test:test.name,passed:true,layouts,exactGuestJPEG:true,oneSheetPerTap:true,customerDataUnchanged:true,sameEventBack:true,noBackendWrites:true});
 }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`,fullPage:true}).catch(()=>{});results.push({engine,test:test.name,passed:false,error:error.message,writes,errors});throw error;}
 finally{await context.close();}
}
async function routeCases(browser,engine){
 const test=cases[0],fixture=await seededPage(browser,test),{page,context,writes,before}=fixture;
 try{
  for(const [name,query]of [['active-event',''],['return-to','?returnTo='+encodeURIComponent(scope.home)]]){
   await page.goto(base+'/print-test'+query,{waitUntil:'networkidle'});await page.getByTestId('print-test-preview').waitFor();assert.equal(await page.getByTestId('staff-page-back').getAttribute('href'),scope.home,name+' preserves the event context');assert.deepEqual(await snapshot(page),before,name+' is read-only');
  }
  await page.goto(base+'/print-test?booth_event=missing-approved-event',{waitUntil:'networkidle'});assert.equal(await page.getByTestId('print-test-preview').count(),0,'an event without a saved design cannot print an unrelated sample');assert.equal(await page.getByTestId('print-test-print').count(),0);assert.equal(await page.getByRole('link',{name:/Choose event.*design/}).count(),1);assert.deepEqual(await snapshot(page),before);assert.deepEqual(writes,[]);
  results.push({engine,test:'active-context-return-and-missing-event',passed:true,readOnly:true});
 }finally{await context.close();}
 const unsigned=await browser.newContext({serviceWorkers:'block',ignoreHTTPSErrors:true}),locked=await unsigned.newPage();
 try{await locked.goto(base+'/print-test?booth_event='+eventId,{waitUntil:'networkidle'});const url=new URL(locked.url());assert.equal(url.pathname,'/staff/sign-in','printer test remains protected by the actual staff middleware');assert.equal(url.searchParams.get('next'),'/print-test?booth_event='+eventId);results.push({engine,test:'real-staff-middleware-protection',passed:true});}
 finally{await unsigned.close();}
}
async function globalCoordinatorGuard(browser,engine){
 const fixture=await seededPage(browser,cases[0]),{page,context,writes,syncReads}=fixture;
 try{
  await page.evaluate(({configKey,tokenKey,statusKey,scope,eventId})=>{
   const cfg=JSON.parse(localStorage.getItem(configKey));cfg.adminHandoff={source:'staff',revision:'2026-10-09T12:00:00.000Z',syncTicket:null};localStorage.setItem(configKey,JSON.stringify(cfg));
   localStorage.setItem(tokenKey,'fixture-event-backup.'+'a'.repeat(43));localStorage.setItem(statusKey,JSON.stringify({scope,eventId,state:'offline',total:3,saved:0,pending:3,sessions:1,uploaded:0,lastSyncedAt:null}));
  },{configKey:scope.config,tokenKey:tokenKey(eventId),statusKey:backupStatusKey(eventId),scope:scope.archive,eventId});
  const before=await snapshot(page);
  await page.goto(base+'/print-test?booth_event='+eventId,{waitUntil:'networkidle'});await page.getByTestId('print-test-preview').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid="print-test-print"]')?.disabled);
  await page.evaluate(()=>{for(const type of ['offline','online','popstate','hashchange'])window.dispatchEvent(new Event(type));document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new CustomEvent('friendly-booth-photo-saved',{detail:{scope:'transfer:approved-print-rehearsal-fixture',id:'existing-customer-photo',kind:'keepsake'}}));});
  // A browser task and network settling let all synchronous/event effects run;
  // no source-string assertions or disabled implementation hooks are used.
  await page.waitForLoadState('networkidle');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await snapshot(page),before,'global autosync and photo backup remain inactive throughout a read-only printer rehearsal');assert.deepEqual(writes,[]);assert.deepEqual(syncReads,[]);
  results.push({engine,test:'global-coordinator-guard-with-pending-customer-photos',passed:true,noSyncReadsOrWrites:true,customerDataUnchanged:true});
 }finally{await context.close();}
}
try{
 for(const [engine,api]of engines){
  const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}:{})});
  try{for(const test of cases)await rehearsalCase(browser,engine,test);await routeCases(browser,engine);await globalCoordinatorGuard(browser,engine);}
  finally{await browser.close();}
 }
}catch(error){if(!results.some(result=>!result.passed))results.push({test:'proof-harness',passed:false,error:error.message});console.error(error);process.exitCode=1;}
finally{await writeFile(out+'/results.json',JSON.stringify({base,release:BOOTH_RELEASE,results},null,2));await new Promise(resolve=>proxy.close(resolve));await rm(tlsDirectory,{recursive:true,force:true});}
console.log(JSON.stringify({release:BOOTH_RELEASE,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,physicalPrinterUsed:false},null,2));
