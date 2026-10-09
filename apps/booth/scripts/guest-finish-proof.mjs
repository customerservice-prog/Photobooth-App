import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {octoberPreset,EVENT_KEYS,LEGACY_KEYS,PREP_CHECKS} from '../app/lib/event-workspace.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';
import {createCustomDesign,validateCustomDesign} from '../app/lib/custom-design.mjs';

// Actual capture/render flow in isolated browser storage with a fake camera.
// Safe for the public deployed booth: no printing, native share, delivery POST,
// credentials, protected setup visits, or customer browser storage is touched.
const production='https://photobooth-booth-production.up.railway.app';
const base=(process.env.GUEST_FINISH_BASE_URL||process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const origin=new URL(base).origin,flag=name=>process.env[name]==='1';
const ignoreHTTPSErrors=flag('WELCOME_LIVE_IGNORE_HTTPS_ERRORS');
const mockDelivery=flag('GUEST_FINISH_MOCK_DELIVERY');
const customProof=flag('CUSTOM_DESIGN_PROOF');
assert(!ignoreHTTPSErrors||origin===production,'TLS-ignore smoke is limited to the known public Railway booth');
let proxy;
if(flag('WELCOME_LIVE_PROXY')){
 const value=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;assert(value,'Managed proxy smoke needs HTTPS_PROXY or HTTP_PROXY');
 const url=new URL(value);proxy={server:`${url.protocol}//${url.host}`,...(url.username?{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}:{})};
}
const engines=flag('GUEST_FINISH_CHROMIUM_ONLY')||flag('WELCOME_LIVE_CHROMIUM_ONLY')?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const out=customProof?'custom-design-proof':'guest-finish-proof',results=[];await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');

async function checkGeometry(page,label){
 for(const [device,width,height]of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844]]){
  await page.setViewportSize({width,height});
  const image=page.getByTestId('approved-finished-jpeg'),imageRect=await image.boundingBox();
  assert(imageRect&&imageRect.width>=120&&imageRect.height>=180&&imageRect.x>=-1&&imageRect.x+imageRect.width<=width+1&&imageRect.y>=-1&&imageRect.y+imageRect.height<=height+1,label+' '+device+' finished image is fully visible '+JSON.stringify({imageRect,viewport:[width,height]}));
  assert(Math.abs(imageRect.width/imageRect.height-2/3)<.01,label+' '+device+' keeps the whole 4x6 image');
  for(const id of ['approved-print','approved-digital-copy','approved-done']){
   const button=page.getByTestId(id),box=await button.boundingBox();
   assert(box&&box.height>=44&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,label+' '+device+' '+id+' is visible');
   assert(await button.evaluate(element=>{const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));}),label+' '+device+' action is uncovered');
  }
  assert(!await page.locator('.agGuest').evaluate(element=>element.scrollWidth>element.clientWidth+1),label+' '+device+' has no horizontal overflow');
  await page.screenshot({path:`${out}/${label}-${device}.png`});
 }
}

async function runCase(browser,engine,scope,total){
 const label=`${engine}-${scope}-${total}-photo`,keys=scope==='legacy'?LEGACY_KEYS:EVENT_KEYS;
 const config={...octoberPreset(),defaultTemplate:scope==='legacy'?'blush':'champagne',photoFit:'fit',setupComplete:true,
  printPackage:{...octoberPreset().printPackage,shotsPerSession:scope==='legacy'?3:4},
  // No guestMode setting: old local events and unapproved rehearsal configs
  // must receive the identical simple finish screen too.
  preparation:{colorsConfirmed:true,checks:Object.fromEntries(Object.keys(PREP_CHECKS).map(key=>[key,true]))}};
 if(customProof){
  const spec=createCustomDesign(scope==='legacy'?'build':'upload');
  spec.background='#162e48';spec.accent='#ed9c37';spec.ink='#fff5dd';
  spec.heading='CUSTOM CELEBRATION';spec.footer='Made for this event';
  if(scope==='managed'){
   for(const key of ['one','four']){
    const bytes=await sharp({create:{width:1200,height:1800,channels:3,background:key==='one'?'#633165':'#162e48'}}).jpeg({quality:85}).toBuffer();
    spec.layouts[key].image='data:image/jpeg;base64,'+bytes.toString('base64');
   }
  }
  config.defaultTemplate='custom';config.customDesign=validateCustomDesign(spec);
 }
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',acceptDownloads:true,serviceWorkers:'block',ignoreHTTPSErrors});
 const writes=[],protectedVisits=[],errors=[];
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method())){writes.push({method:request.method(),path:url.pathname});return route.abort();}
  if(/^\/(setup|event-prep|event-studio)(\/|$)/.test(url.pathname)){protectedVisits.push(url.pathname);return route.abort();}
  if(url.origin!==origin)return route.abort();
  if(mockDelivery&&url.pathname==='/api/delivery/config')return route.fulfill({json:{paired:true,pairingConfigured:true,email:{configured:true,missing:[]},sms:{configured:false,missing:[]},limits:{email:100,sms:100}}});
  return route.continue();
 });
 await context.addInitScript(({config,keys,scope})=>{
  localStorage.setItem(keys.config,JSON.stringify(config));
  if(scope==='legacy')localStorage.setItem(keys.usage,'19');else{localStorage.setItem(keys.liveUsage,'19');localStorage.setItem(keys.demoUsage,'4');}
  window.__finishDraws=0;window.__finishPrints=0;window.__finishShares=0;window.__finishCameraStarts=0;
  window.print=()=>{window.__finishPrints++;throw new Error('Public finish proof must not print');};
  Object.defineProperty(navigator,'share',{configurable:true,value:()=>{window.__finishShares++;throw new Error('Public finish proof must not send messages');}});
  Object.defineProperty(window,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('Test visual countdown fallback');}}});
  Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
  const original=CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLVideoElement)window.__finishDraws++;return original.call(this,source,...args);};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{
   assertNoMicrophone(options);window.__finishCameraStarts++;
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');let frame=0;
   const draw=()=>{frame++;ctx.fillStyle=['#286888','#6f396b','#5b7941','#8e512d'][Math.floor(frame/8)%4];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff9e0';ctx.font='bold 62px sans-serif';ctx.fillText('POSE '+frame,100,245);ctx.fillRect(frame%580,310,26,28);};
   draw();const stream=canvas.captureStream(20),timer=setInterval(draw,70);
   const track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};return stream;
  }}});
  function assertNoMicrophone(options){if(options.audio!==false)throw new Error('Guest camera must not request microphone');}
 },{config,keys,scope});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+(scope==='legacy'?'/':'/?event=oct10-2026&demo=1'),{waitUntil:'networkidle',timeout:30000});
  const release=await page.evaluate(async()=>{const response=await fetch('/api/app-version',{cache:'no-store'});return {status:response.status,data:await response.json()};});
  assert.equal(release.status,200);assert.equal(release.data.version,BOOTH_RELEASE);
  const configBefore=await page.evaluate(key=>localStorage.getItem(key),keys.config);
  await page.getByTestId(total===1?'welcome-quick-photo':'welcome-four-photo').click();
  // Use the real "I'm ready" action between poses to keep this bounded.
  const deadline=Date.now()+100000;
  while(!await page.getByTestId('approved-guest-preview').count()){
   assert(Date.now()<deadline,label+' capture did not finish');
   const ready=page.getByRole('button',{name:/I’m ready — start countdown/});
   if(await ready.count())await ready.click().catch(()=>{});
   await page.waitForTimeout(120);
  }
  const bytes=await assertFinishedGuest(page,total),metadata=await sharp(bytes).metadata();
  assert.equal(metadata.width,1200);assert.equal(metadata.height,1800);
  if(customProof){
   const pixel=await sharp(bytes).extract({left:40,top:500,width:1,height:1}).raw().toBuffer();
   const expected=scope==='managed'&&total===1?[99,49,101]:[22,46,72];
   expected.forEach((channel,i)=>assert(Math.abs(pixel[i]-channel)<12,'custom approved background survives finished JPEG'));
  }
  assert.equal(await page.getByTestId('approved-guest-preview').getAttribute('data-template'),config.defaultTemplate);
  await checkGeometry(page,label);
  const stored=await page.evaluate(async({source,archive})=>{
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')(),rows=await api.listCaptures(archive);
   return {count:rows.length,poses:rows[0].poses.length,hashes:await Promise.all(rows[0].poses.map(async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).join(','))),finished:Array.from(new Uint8Array(await rows[0].keepsake.arrayBuffer()))};
  },{source:archiveSource,archive:scope==='legacy'?'legacy':'oct10-2026:demo'});
  assert.equal(stored.count,1);assert.equal(stored.poses,total);assert.equal(new Set(stored.hashes).size,total,'all captured original poses are distinct');assert.deepEqual(Buffer.from(stored.finished),bytes,'event archive keeps the exact guest finished picture');
  await page.setViewportSize({width:1024,height:768});
  await page.getByTestId('approved-digital-copy').click();await page.getByRole('dialog',{name:'Send your photo.',exact:true}).waitFor();
  if(mockDelivery&&scope==='legacy'){
   await page.locator('.deliveryForm').waitFor();
   assert.equal(await page.locator('.deliveryForm input[type="email"]').inputValue(),'');
   assert(await page.getByRole('button',{name:'Send my keepsake',exact:true}).isDisabled(),'configured Send still requires the guest contact and consent');
   await page.screenshot({path:`${out}/${label}-configured-send.png`});
  }
  const downloadWait=page.waitForEvent('download');await page.getByTestId('approved-download-photo').click();const download=await downloadWait;assert.deepEqual(await readFile(await download.path()),bytes,'Save uses the same preloaded finished picture');
  await page.keyboard.press('Escape');
  const state=await page.evaluate(({keys,scope})=>({usage:localStorage.getItem(scope==='legacy'?keys.usage:keys.liveUsage),demoUsage:scope==='legacy'?null:localStorage.getItem(keys.demoUsage),draws:window.__finishDraws,prints:window.__finishPrints,shares:window.__finishShares,cameraStarts:window.__finishCameraStarts}),{keys,scope});
  assert.deepEqual(state,{usage:'19',demoUsage:scope==='legacy'?null:'4',draws:total,prints:0,shares:0,cameraStarts:1});
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),keys.config),configBefore,'taking photos never changes the customer-approved event design');
  await page.getByTestId('approved-done').click();await page.getByTestId('welcome-four-photo').waitFor({timeout:10000});
  assert.equal(await page.getByTestId('approved-guest-preview').count(),0);
  assert.deepEqual(writes,[]);assert.deepEqual(protectedVisits,[]);assert.deepEqual(errors,[]);
  results.push({test:label,passed:true,browserVersion:browser.version(),release:release.data.version,state,poses:stored.poses,uniquePoses:new Set(stored.hashes).size,exactArchivedAndDownloadedJPEG:true,mockedDeliveryConfiguration:mockDelivery,writeRequests:writes,protectedVisits});
 }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`,fullPage:true}).catch(()=>{});results.push({test:label,passed:false,message:error.message,stack:error.stack,writeRequests:writes,protectedVisits});throw error;}
 finally{await context.close();}
}

try{
 for(const [engine,api]of engines){
  const browser=await api.launch({headless:true,...(proxy?{proxy}:{}),...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  try{
   const cases=['legacy','managed'].flatMap(scope=>[1,4].map(total=>[scope,total]));
   const finished=await Promise.allSettled(cases.map(([scope,total])=>runCase(browser,engine,scope,total)));
   const failed=finished.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  }
  finally{await browser.close();}
 }
}catch(error){console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,expectedRelease:BOOTH_RELEASE,ignoreHTTPSErrors,managedProxy:!!proxy,mockedDeliveryConfiguration:mockDelivery,results},null,2));
console.log(JSON.stringify({base,expectedRelease:BOOTH_RELEASE,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length},null,2));
