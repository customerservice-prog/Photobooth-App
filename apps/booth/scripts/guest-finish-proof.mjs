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
const eventProof=flag('EVENT_DESIGN_PROOF');
assert(!(customProof&&eventProof),'Run standard and custom artwork proofs separately');
assert(!ignoreHTTPSErrors||origin===production,'TLS-ignore smoke is limited to the known public Railway booth');
let proxy;
if(flag('WELCOME_LIVE_PROXY')){
 const value=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;assert(value,'Managed proxy smoke needs HTTPS_PROXY or HTTP_PROXY');
 const url=new URL(value);proxy={server:`${url.protocol}//${url.host}`,...(url.username?{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}:{})};
}
const engines=flag('GUEST_FINISH_CHROMIUM_ONLY')||flag('WELCOME_LIVE_CHROMIUM_ONLY')?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const out=eventProof?'event-design-proof':customProof?'custom-design-proof':'guest-finish-proof',results=[];await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
// Explicit customer-facing design expectations, independent of the theme helper.
const standardEvents=[
 {label:'graduation',type:'graduation',template:'grad-gala',name:'Morgan',paper:'#05182f',ink:'#fff1c8',accent:'#ff972b',details:{graduate:'Morgan',classYear:'2027'}},
 {label:'wedding',type:'wedding',template:'ivory',name:'Ava & Miles',paper:'#f7f1e7',ink:'#655044',accent:'#b19565',details:{partner1:'Ava',partner2:'Miles'}},
 {label:'birthday',type:'birthday',template:'ivory',name:'Riley',paper:'#f6e9dc',ink:'#824f52',accent:'#c69b60',details:{honoree:'Riley',age:'21'}},
 {label:'quinceanera',type:'other',template:'quince-royal',name:'Sofia',paper:'#e9d8f5',ink:'#442057',accent:'#bc915c',details:{eventName:'Sofia’s quinceañera',honoree:'Sofia'}},
 {label:'corporate',type:'corporate',template:'blush',name:'North & Co.',paper:'#222a28',ink:'#f7ecd5',accent:'#c5a15d',details:{company:'North & Co.',eventName:'Annual Gala'}}
];
const channels=color=>[1,3,5].map(index=>parseInt(color.slice(index,index+2),16));
async function checkTheme(page,config,total,fixture){
 const preview=page.getByTestId('approved-guest-preview');
 let expected;
 if(fixture)expected={paper:fixture.paper,ink:fixture.ink,accent:fixture.accent,source:'builtin'};
 else if(customProof)expected={paper:config.customDesign.mode==='upload'&&total===1?'#633165':'#162e48',ink:config.customDesign.mode==='build'?'#fff5dd':null,accent:config.customDesign.mode==='build'?'#ed9c37':'#d4ad73',source:'custom-'+config.customDesign.mode};
 if(!expected)return null;
 assert.equal(await preview.getAttribute('data-design-key'),config.type+'/'+config.defaultTemplate);
 assert.equal(await preview.getAttribute('data-theme-source'),expected.source);
 await page.waitForFunction(({expectedPaper,tolerance})=>{
  const paper=document.querySelector('[data-testid="approved-guest-preview"]')?.getAttribute('data-theme-paper');
  if(!/^#[0-9a-f]{6}$/i.test(paper||''))return false;
  return [1,3,5].every(index=>Math.abs(parseInt(paper.slice(index,index+2),16)-parseInt(expectedPaper.slice(index,index+2),16))<=tolerance);
 },{expectedPaper:expected.paper,tolerance:expected.source==='custom-upload'?3:0},{timeout:5000});
 const actual=await preview.evaluate(element=>{
  const style=getComputedStyle(element),print=getComputedStyle(element.querySelector('[data-testid="approved-print"]'));
  return {paper:style.getPropertyValue('--ag-paper').trim(),ink:style.getPropertyValue('--ag-ink').trim(),accent:style.getPropertyValue('--ag-accent').trim(),printBackground:print.backgroundColor};
 });
 channels(expected.paper).forEach((channel,i)=>assert(Math.abs(channels(actual.paper)[i]-channel)<=(expected.source==='custom-upload'?3:0),'wrapper paper follows selected artwork'));
 if(expected.ink)assert.equal(actual.ink,expected.ink,'page ink comes from the selected design');
 assert.equal(actual.accent,expected.accent,'page accent comes from the selected design');
 assert.equal(actual.printBackground,'rgb('+channels(expected.accent).join(', ')+')','Print uses the selected design accent');
 return {expected,actual};
}

async function checkGeometry(page,label){
 const geometry=[];
 for(const [device,width,height]of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844]]){
  await page.setViewportSize({width,height});
  const image=page.getByTestId('approved-finished-jpeg');
  // WebKit can finish setViewportSize before media/container-query layout has
  // settled. Wait for two equal frame samples, bounded to four seconds.
  const metrics=await image.evaluate(async(element,viewport)=>{
   if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1000))]);
   const rect=element=>{if(!element)return null;const b=element.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
   const number=value=>parseFloat(value)||0;
   function snapshot(){
    const imageRect=rect(element),style=getComputedStyle(element),paper=element.closest('.agPaperWrap'),paperStyle=paper?getComputedStyle(paper):null;
    const left=number(style.borderLeftWidth)+number(style.paddingLeft),right=number(style.borderRightWidth)+number(style.paddingRight);
    const top=number(style.borderTopWidth)+number(style.paddingTop),bottom=number(style.borderBottomWidth)+number(style.paddingBottom);
    const content={x:imageRect.x+left,y:imageRect.y+top,width:imageRect.width-left-right,height:imageRect.height-top-bottom};
    const scale=Math.min(content.width/element.naturalWidth,content.height/element.naturalHeight);
    const drawnWidth=element.naturalWidth*scale,drawnHeight=element.naturalHeight*scale;
    const drawnRect={x:content.x+(content.width-drawnWidth)/2,y:content.y+(content.height-drawnHeight)/2,width:drawnWidth,height:drawnHeight};
    const paperRect=rect(paper),paperInner=paperRect&&{x:paperRect.x+number(paperStyle.borderLeftWidth),y:paperRect.y+number(paperStyle.borderTopWidth),width:paperRect.width-number(paperStyle.borderLeftWidth)-number(paperStyle.borderRightWidth),height:paperRect.height-number(paperStyle.borderTopWidth)-number(paperStyle.borderBottomWidth)};
    return {imageRect,drawnRect,paperInner,natural:[element.naturalWidth,element.naturalHeight],objectFit:style.objectFit,objectPosition:style.objectPosition,complete:element.complete,viewport:[innerWidth,innerHeight]};
   }
   const deadline=Date.now()+4000;let previous='',equal=0,current;
   do{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    current=snapshot();
    const key=JSON.stringify([current.imageRect,current.paperInner,current.viewport]);
    equal=key===previous?equal+1:0;previous=key;
    if(equal>=2&&current.complete&&current.viewport[0]===viewport[0]&&current.viewport[1]===viewport[1])return {...current,settled:true};
   }while(Date.now()<deadline);
   return {...current,settled:false};
  },[width,height]);
  const {imageRect,drawnRect,paperInner}=metrics,diagnostic=JSON.stringify(metrics);
  assert(metrics.settled,label+' '+device+' layout settles after resize '+diagnostic);
  assert.deepEqual(metrics.natural,[1200,1800],label+' '+device+' keeps the full-resolution JPEG '+diagnostic);
  assert.equal(metrics.objectFit,'contain',label+' '+device+' never crops or stretches the JPEG '+diagnostic);
  assert.equal(metrics.objectPosition,'50% 50%',label+' '+device+' centers the contained JPEG '+diagnostic);
  const visible=box=>box&&box.width>=120&&box.height>=180&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1;
  assert(visible(imageRect),label+' '+device+' finished image element is fully visible '+diagnostic);
  // A contained JPEG may have white letterboxing inside its element. Check
  // the actual drawn photo's 2:3 ratio, not that letterboxed element's ratio.
  assert(visible(drawnRect)&&Math.abs(drawnRect.width/drawnRect.height-2/3)<.01,label+' '+device+' keeps the whole 4x6 photo '+diagnostic);
  const minimumHeight={'ipad-landscape':480,'ipad-portrait':580,phone:380}[device];
  assert(drawnRect.height>=minimumHeight,label+' '+device+' displays a large finished photo '+diagnostic);
  assert(paperInner&&drawnRect.x>=paperInner.x-1&&drawnRect.y>=paperInner.y-1&&drawnRect.x+drawnRect.width<=paperInner.x+paperInner.width+1&&drawnRect.y+drawnRect.height<=paperInner.y+paperInner.height+1,label+' '+device+' paper frame does not clip the photo '+diagnostic);
  for(const id of ['approved-print','approved-digital-copy','approved-done']){
   const button=page.getByTestId(id),box=await button.boundingBox();
   assert(box&&box.height>=44&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,label+' '+device+' '+id+' is visible');
   assert(await button.evaluate(element=>{const box=element.getBoundingClientRect();return element.contains(document.elementFromPoint(box.x+box.width/2,box.y+box.height/2));}),label+' '+device+' action is uncovered');
  }
  assert(!await page.locator('.agGuest').evaluate(element=>element.scrollWidth>element.clientWidth+1),label+' '+device+' has no horizontal overflow');
  await page.screenshot({path:`${out}/${label}-${device}.png`});
  geometry.push({device,...metrics});
 }
 return geometry;
}

async function runCase(browser,engine,scope,total,fixture){
 const label=`${engine}-${fixture?.label||scope}-${total}-photo`,keys=scope==='legacy'?LEGACY_KEYS:EVENT_KEYS;
 const config={...octoberPreset(),defaultTemplate:scope==='legacy'?'blush':'champagne',photoFit:'fit',setupComplete:true,
  printPackage:{...octoberPreset().printPackage,shotsPerSession:scope==='legacy'?3:4},
  // No guestMode setting: old local events and unapproved rehearsal configs
  // must receive the identical simple finish screen too.
  preparation:{colorsConfirmed:true,checks:Object.fromEntries(Object.keys(PREP_CHECKS).map(key=>[key,true]))}};
 if(fixture){
  Object.assign(config,{type:fixture.type,title:fixture.name,date:'June 10, 2027',defaultTemplate:fixture.template,guestMode:'approved',approvedPrintName:fixture.name,
   details:{...config.details,...fixture.details},printPackage:{...config.printPackage,shotsPerSession:4}});
 }
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
  if(fixture){
   // The server-rendered welcome uses the default Other design until React
   // loads this browser's saved config. Network idle does not await hydration.
   await page.waitForFunction(expected=>{
    const designs=Array.from(document.querySelectorAll('.bwLayoutPreview svg[data-design]'),element=>element.getAttribute('data-design'));
    return designs.length===3&&designs.every(design=>design===expected);
   },fixture.type+'-'+fixture.template,{timeout:10000});
   const welcomeDesigns=await page.locator('.bwLayoutPreview svg[data-design]').evaluateAll(elements=>elements.map(element=>element.getAttribute('data-design')));
   assert.deepEqual(welcomeDesigns,Array(3).fill(fixture.type+'-'+fixture.template),'both welcome layouts use the approved event artwork');
  }
  // Keep the canvas-stream camera in WebKit's active page while it captures.
  if(engine==='webkit')await page.bringToFront();
  await page.getByTestId(total===1?'welcome-quick-photo':'welcome-four-photo').click();assert.equal(await page.getByTestId('welcome-large-proof').getAttribute('data-selected-photos'),String(total));await page.getByTestId('welcome-start-session').click();
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
  const theme=await checkTheme(page,config,total,fixture);
  if(fixture&&fixture.label!=='graduation'){
   const pixel=await sharp(bytes).extract({left:10,top:900,width:1,height:1}).raw().toBuffer();
   channels(fixture.paper).forEach((channel,i)=>assert(Math.abs(pixel[i]-channel)<12,'finished JPEG retains the selected event background'));
  }
  const geometry=await checkGeometry(page,label);
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
  results.push({test:label,passed:true,browserVersion:browser.version(),release:release.data.version,selectedDesign:config.type+'/'+config.defaultTemplate,theme,state,poses:stored.poses,uniquePoses:new Set(stored.hashes).size,exactArchivedAndDownloadedJPEG:true,mockedDeliveryConfiguration:mockDelivery,geometry,writeRequests:writes,protectedVisits});
 }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`,fullPage:true}).catch(()=>{});results.push({test:label,passed:false,message:error.message,stack:error.stack,writeRequests:writes,protectedVisits});throw error;}
 finally{await context.close();}
}

try{
 for(const [engine,api]of engines){
  const browser=await api.launch({headless:true,...(proxy?{proxy}:{}),...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  try{
   const cases=eventProof?standardEvents.flatMap(fixture=>[1,4].map(total=>['legacy',total,fixture])):['legacy','managed'].flatMap(scope=>[1,4].map(total=>[scope,total]));
   // Concurrent background canvas streams can stop presenting fresh frames in
   // headless WebKit. Exercise every case in one active camera page at a time.
   const concurrency=engine==='webkit'?1:4;
   for(let start=0;start<cases.length;start+=concurrency){
    const finished=await Promise.allSettled(cases.slice(start,start+concurrency).map(([scope,total,fixture])=>runCase(browser,engine,scope,total,fixture)));
    const failed=finished.find(result=>result.status==='rejected');if(failed)throw failed.reason;
   }
  }
  finally{await browser.close();}
 }
}catch(error){console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,expectedRelease:BOOTH_RELEASE,ignoreHTTPSErrors,managedProxy:!!proxy,mockedDeliveryConfiguration:mockDelivery,results},null,2));
console.log(JSON.stringify({base,expectedRelease:BOOTH_RELEASE,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length},null,2));
