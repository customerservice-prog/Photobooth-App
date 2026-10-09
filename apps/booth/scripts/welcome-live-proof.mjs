import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {octoberPreset,EVENT_KEYS,PREP_CHECKS} from '../app/lib/event-workspace.mjs';
import {getDesign} from '../app/lib/template-registry.mjs';

// Public, isolated welcome checks only. Never enter a PIN or begin a session.
const production='https://photobooth-booth-production.up.railway.app';
const base=(process.env.WELCOME_BASE_URL||production).replace(/\/$/,'');
const origin=new URL(base).origin;
const enabled=name=>process.env[name]==='1';
const ignoreHTTPSErrors=enabled('WELCOME_LIVE_IGNORE_HTTPS_ERRORS');
assert(!ignoreHTTPSErrors||origin===production,'TLS-ignore smoke is limited to the known public Railway booth');
let proxy;
if(enabled('WELCOME_LIVE_PROXY')){
 const value=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
 assert(value,'Managed proxy smoke requires HTTPS_PROXY or HTTP_PROXY');
 const url=new URL(value);
 proxy={server:`${url.protocol}//${url.host}`,...(url.username?{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}:{})};
}
const out='welcome-proof';await mkdir(out,{recursive:true});
const results=[];
const engines=enabled('WELCOME_LIVE_CHROMIUM_ONLY')?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
let browser,activePage;

async function checkGeometry(page,label,width,height){
 await page.setViewportSize({width,height});
 const staff=page.getByTestId('welcome-staff-tools');
 const staffRect=await staff.boundingBox();
 assert(await staff.isVisible(),label+' staff tools is visible');
 assert(staffRect&&staffRect.height>=44&&staffRect.y>=0&&staffRect.y+staffRect.height<=height+1,label+' staff tools is reachable');
 const geometry=await page.locator('.bwWelcome').evaluate(root=>({
  clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,
  cards:[...root.querySelectorAll('.bwSessionCard')].map(button=>{
   const box=button.getBoundingClientRect(),svg=button.querySelector('.bwLayoutPreview svg').getBoundingClientRect(),caption=button.querySelector('.bwPreviewCaption').getBoundingClientRect(),cta=button.querySelector('.bwCardCTA').getBoundingClientRect();
   return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,height:box.height,svg:{left:svg.left,right:svg.right,top:svg.top,bottom:svg.bottom,width:svg.width,height:svg.height},caption:{top:caption.top,bottom:caption.bottom},cta:{left:cta.left,right:cta.right,top:cta.top,bottom:cta.bottom,width:cta.width,height:cta.height}};
  })
 }));
 assert(geometry.scrollWidth<=geometry.clientWidth+1,label+' has no horizontal overflow');
 assert.equal(geometry.cards.length,2);
 for(let index=0;index<geometry.cards.length;index++){
  const card=geometry.cards[index];
  assert(card.left>=-1&&card.right<=width+1&&card.height>=44,label+' choice stays inside the screen');
  assert(card.svg.width>40&&card.svg.height>60,label+' real print preview is visible');
  assert(card.svg.left>=card.left-1&&card.svg.right<=card.right+1,label+' preview stays inside its choice');
  assert(card.svg.bottom<=card.caption.top+1&&card.caption.bottom<=card.cta.top+1,label+' preview, caption and action do not overlap');
  assert(card.cta.width>60&&card.cta.height>18&&card.cta.bottom<=card.bottom+1,label+' start action is visible inside its button');
  if(width>=768)assert(card.top>=0&&card.bottom<=height+1,label+' both choices fit above the fold');
  const button=page.locator('.bwSessionCard').nth(index);
  await button.scrollIntoViewIfNeeded();
  assert(await button.locator('.bwCardCTA').evaluate(cta=>{
   const box=cta.getBoundingClientRect(),button=cta.closest('button');
   return box.top>=-1&&box.bottom<=innerHeight+1&&button.contains(document.elementFromPoint(box.left+box.width/2,box.top+box.height/2));
  }),label+' start action is reachable and uncovered');
 }
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:`${out}/live-${label}.png`,fullPage:true});
 results.push({test:label+'-actual-preview-geometry',passed:true,viewport:[width,height],geometry});
}

async function approvedWelcome(engine,type,template){
 const config={...octoberPreset(),guestMode:'approved',type,defaultTemplate:template,
  details:{...octoberPreset().details,graduate:'Taylor',classYear:'2027'},
  preparation:{colorsConfirmed:true,checks:Object.fromEntries(Object.keys(PREP_CHECKS).map(key=>[key,true]))}};
 const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce',serviceWorkers:'block',ignoreHTTPSErrors});
 const writes=[],protectedVisits=[],externalRequests=[],errors=[];
 // This rejects and records accidental writes before they can reach production.
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method())){writes.push({method:request.method(),path:url.pathname});return route.abort();}
  if(/^\/(setup|event-prep|event-studio)(\/|$)/.test(url.pathname)){protectedVisits.push(url.pathname);return route.abort();}
  if(url.origin!==origin){externalRequests.push(url.origin);return route.abort();}
  return route.continue();
 });
 await context.addInitScript(({config,keys})=>{
  localStorage.setItem(keys.config,JSON.stringify(config));localStorage.setItem(keys.liveUsage,'19');
  window.__liveProofCaptureCalls=0;window.__liveProofPrintCalls=0;
  window.print=()=>{window.__liveProofPrintCalls++;throw new Error('Public welcome proof must never print');};
  if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__liveProofCaptureCalls++;return Promise.reject(new Error('Public welcome proof must never capture'));};
 },{config,keys:EVENT_KEYS});
 const page=await context.newPage();activePage=page;page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(base+'/?event=oct10-2026',{waitUntil:'networkidle',timeout:30000});
  const release=await page.evaluate(async()=>{const response=await fetch('/api/app-version',{cache:'no-store'});return {status:response.status,data:await response.json()};});
  assert.equal(release.status,200);assert.equal(release.data.version,BOOTH_RELEASE,'deployed booth must match the exact checked-out release');
  await page.locator('.bwWelcome[data-capture-mode="photo"]').waitFor();
  await page.waitForFunction(()=>document.querySelector('#bwEventTitle')?.textContent==='October 10 Photo Booth Party');
  await page.waitForFunction(()=>!document.querySelector('[data-testid="welcome-four-photo"]')?.disabled);
  assert.equal(await page.locator('.bwSessionChoices button').count(),2);
  assert.equal(await page.locator('.bwSessionCard .bwLayoutPreview svg').count(),2);
  for(const [id,shots]of [['welcome-quick-photo',1],['welcome-four-photo',4]]){
   const button=page.getByTestId(id),svg=button.locator('.bwLayoutPreview svg');
   assert.equal(await button.evaluate(element=>element.tagName),'BUTTON');assert(await button.isVisible()&&await button.isEnabled());
   assert.equal(await button.getAttribute('aria-label'),`Take ${shots} photo${shots===1?'':'s'}`);
   assert.equal(await button.locator('.bwLayoutPreview').getAttribute('data-preview-photos'),String(shots));
   assert.equal(await svg.getAttribute('data-design'),type+'-'+template);
   const expectedLayout=template==='grad-gala'?(shots===1?'card':'photo_strip'):getDesign(type,template).layout;
   assert.equal(await svg.getAttribute('data-layout'),expectedLayout);
   if(type==='other')assert.equal(await svg.locator('[data-approved-photo-region="true"]').count(),shots===4?1:0);
   assert.equal(await svg.locator('[data-guest-photo="true"]').count(),0,'welcome never reveals another guest photo');
   assert.equal(await button.locator('.bwPreviewCaption').innerText(),'Your photos go here');
  }
  if(type==='other')assert.equal(await page.getByTestId('welcome-four-photo').locator('[data-approved-photo-region="true"][data-pose-count="4"]').count(),1);
  assert.equal(await page.locator('.bwWelcome a,.workspaceBanner,.bwShowcase,.bwPaperStack,.bwPhotoSteps').count(),0,'approved guest welcome has no design or setup navigation');
  assert.equal(await page.getByTestId('app-update').count(),0);
  for(const [label,width,height]of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844]])await checkGeometry(page,`${engine}-${type}-${label}`,width,height);
  await page.setViewportSize({width:1024,height:768});
  const readinessResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/staff/unlock'&&response.request().method()==='GET');
  await page.getByTestId('welcome-staff-tools').click();
  const response=await readinessResponse,readiness=await response.json();
  assert.equal(response.status(),200,'real staff readiness endpoint is available');
  assert.equal(readiness.required,true,'production staff authorization is required');
  assert.equal(readiness.configured,true,'production staff authorization is fully configured');
  await page.getByTestId('staff-pin-form').waitFor();
  assert.equal(await page.getByTestId('staff-configuration-error').count(),0);
  assert.equal(await page.locator('#bwStaffPin').getAttribute('type'),'password');
  assert.equal(await page.locator('#bwStaffPin').inputValue(),'');assert(await page.getByTestId('staff-confirm').isDisabled());
  await page.screenshot({path:`${out}/live-${engine}-${type}-staff-pin.png`});
  await page.getByTestId('staff-cancel').click();assert.equal(await page.getByRole('dialog',{name:'Staff access',exact:true}).count(),0);
  const state=await page.evaluate(keys=>({usage:localStorage.getItem(keys.liveUsage),captures:window.__liveProofCaptureCalls,prints:window.__liveProofPrintCalls}),EVENT_KEYS);
  assert.deepEqual(state,{usage:'19',captures:0,prints:0});assert.deepEqual(writes,[]);assert.deepEqual(protectedVisits,[]);assert.deepEqual(errors,[]);
  results.push({test:`${engine}-${type}-approved-matching-layouts-and-real-staff-pin-gate`,passed:true,browserVersion:browser.version(),release:release.data.version,staffReadiness:{required:readiness.required,configured:readiness.configured},state,writeRequests:writes,protectedVisits,blockedExternalRequests:externalRequests});
 }finally{activePage=null;await context.close();}
}

try{
 for(const [engine,api]of engines){
  browser=await api.launch({headless:true,...(proxy?{proxy}:{}),...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  for(const [type,template]of [['other','champagne'],['graduation','grad-gala']])await approvedWelcome(engine,type,template);
  await browser.close();browser=null;
 }
}catch(error){
 results.push({test:'failure',passed:false,message:error.message,stack:error.stack});
 if(activePage)await activePage.screenshot({path:`${out}/live-failure.png`,fullPage:true}).catch(()=>{});
 if(browser)await browser.close().catch(()=>{});console.error(error);process.exitCode=1;
}
await writeFile(`${out}/live-results.json`,JSON.stringify({base,expectedRelease:BOOTH_RELEASE,ignoreHTTPSErrors,managedProxy:!!proxy,results},null,2));
console.log(JSON.stringify({base,expectedRelease:BOOTH_RELEASE,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length},null,2));
