import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {octoberPreset,EVENT_KEYS,PREP_CHECKS} from '../app/lib/event-workspace.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000';
const out='welcome-proof';await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const cfg={title:'October 10 Photo Booth Party',subtitle:'Your Photo Booth Preview',date:'October 10, 2026',type:'other',setupComplete:true,defaultTemplate:'champagne',photoFit:'fit',details:{eventName:'October 10 Photo Booth Party',subtitle:'4–8 PM',primaryColor:'#24352f',secondaryColor:'#d8c49b'},printPackage:{includedPrints:108,addOnPrints:108,shotsPerSession:4,copiesPerSession:1,digitalEnabled:true,printingEnabled:true}};
const results=[];
for(let n=0;n<60;n++){try{const r=await fetch(base);if(r.ok)break;}catch{}if(n===59)throw new Error('Server did not become ready');await new Promise(r=>setTimeout(r,1000));}
async function setup(context){await context.addInitScript(config=>{
 if(!localStorage.getItem('friendly-booth-event-v1'))localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config));
 if(!localStorage.getItem('friendly-booth-print-usage-v1'))localStorage.setItem('friendly-booth-print-usage-v1','7');
 window.print=()=>{window.__proofPrintCalls=(window.__proofPrintCalls||0)+1;window.dispatchEvent(new Event('afterprint'));};
 window.__proofRecordingCalls=0;window.MediaRecorder=class{constructor(){window.__proofRecordingCalls++;throw new Error('Motion recording must never be called in a photo-only booth');}};
},cfg);}
async function settleWelcome(page){
 // Hydration mounts AppUpdate after a client-side return to Welcome. Let its
 // version GET finish before a proof navigation/capture unmounts it; WebKit
 // otherwise reports the deliberately aborted fetch as an access-control error.
 if(await page.locator('.bwWelcome').count())await page.waitForLoadState('networkidle',{timeout:15000});
}
async function open(page){await settleWelcome(page);await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]');await page.waitForFunction(()=>document.querySelector('#bwEventTitle')?.textContent==='October 10 Photo Booth Party');await page.waitForTimeout(400);await settleWelcome(page);}
async function assertPhotoOnly(page){assert.equal(await page.locator('.bwSessionChoices button').count(),2);assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);assert.equal(await page.getByTestId('welcome-four-photo').count(),1);assert.equal(await page.getByTestId('welcome-video').count(),0);assert.equal(await page.getByTestId('booth-sound-test').count(),0,'Speaker testing belongs only in Staff Tools, not the guest welcome screen');assert.equal(await page.getByText('Test speaker',{exact:true}).count(),0);assert.equal(await page.getByTestId('welcome-gif').count(),0);assert.equal(await page.locator('.bwSessionCard .bwLayoutPreview svg').count(),2,'both choices show the actual print layout');assert.equal(await page.getByTestId('welcome-large-proof').locator('svg').count(),1,'one large matching print proof');assert.equal(await page.getByTestId('welcome-start-session').count(),1);assert.equal(await page.locator('.bwShowcase,.bwPaperStack,.bwPhotoSteps').count(),0,'guest choices replace the old showcase and prose');assert.equal(await page.locator('.bwSessionCard .bwPreviewCaption').count(),2);assert(!/\b(video|gif|boomerang)\b/i.test(await page.locator('.bwWelcome').innerText()));}
async function layout(page,name,w,h){
 await page.setViewportSize({width:w,height:h});await open(page);await assertPhotoOnly(page);assert.equal(await page.locator('h1').count(),1);
 const staffButton=page.getByTestId('welcome-staff-tools'),staffRect=await staffButton.boundingBox();
 assert(await staffButton.isVisible(),name+' staff tools button visible');
 assert(staffRect&&staffRect.height>=44&&staffRect.width>=80&&staffRect.y>=0&&staffRect.y+staffRect.height<=h+1,name+' staff tools reachable without scrolling');
 const data=await page.evaluate(()=>{const root=document.querySelector('.bwWelcome'),footer=document.querySelector('.bwFooter').getBoundingClientRect();return {clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,innerHeight:innerHeight,clientHeight:root.clientHeight,scrollHeight:root.scrollHeight,footerTop:footer.top,buttons:[...document.querySelectorAll('.bwSessionCard')].map(b=>{const r=b.getBoundingClientRect(),proof=b.querySelector('.bwLayoutPreview svg').getBoundingClientRect(),caption=b.querySelector('.bwPreviewCaption').getBoundingClientRect(),cta=b.querySelector('.bwCardCTA').getBoundingClientRect(),top=document.elementFromPoint(cta.left+cta.width/2,Math.min(cta.top+cta.height/2,innerHeight-1));return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,proof:{left:proof.left,right:proof.right,top:proof.top,bottom:proof.bottom,width:proof.width,height:proof.height},caption:{top:caption.top,bottom:caption.bottom},cta:{left:cta.left,right:cta.right,top:cta.top,bottom:cta.bottom,width:cta.width,height:cta.height},covered:cta.bottom<=innerHeight&&!b.contains(top)};})};});
 assert(data.scrollWidth<=data.clientWidth+1,name+' no horizontal overflow');
 for(const b of data.buttons){assert(b.left>=-1&&b.right<=w+1);assert(b.height>=44);assert(!b.covered,name+' photo CTA is not covered');assert(data.footerTop>=b.bottom-1);assert(b.proof.width>40&&b.proof.height>60,name+' actual layout preview is visible');assert(b.proof.left>=b.left-1&&b.proof.right<=b.right+1,name+' preview stays inside its choice');if(w>760||w<=430)assert(b.proof.bottom<=b.caption.top+1,name+' photo preview is clear of caption');assert(b.caption.bottom<=b.cta.top+1,name+' caption is clear of the start action');assert(b.cta.width>60&&b.cta.height>18,name+' visible start action');assert(b.cta.left>=b.left-1&&b.cta.right<=b.right+1&&b.cta.bottom<=b.bottom+1,name+' start action stays in its clickable choice');if(w>=768&&h>=600)assert(b.top>=0&&b.bottom<=h,name+' primary controls above fold');}
 assert(await page.getByTestId('welcome-staff-tools').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-event-v1')).printPackage.addOnPrints),108);
 await page.screenshot({path:`${out}/${name}.png`,fullPage:true});if(w<621)await page.locator('.bwSessionChoices').screenshot({path:`${out}/${name}-keepsakes.png`});results.push({test:name,passed:true,viewport:[w,h],layout:data});
}
async function approvedWelcome(browser,engine){
 const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
 const config={...octoberPreset(),guestMode:'approved',preparation:{colorsConfirmed:true,checks:Object.fromEntries(Object.keys(PREP_CHECKS).map(key=>[key,true]))}};
 await context.addInitScript(({config,keys})=>{if(!localStorage.getItem(keys.config))localStorage.setItem(keys.config,JSON.stringify(config));if(!localStorage.getItem(keys.liveUsage))localStorage.setItem(keys.liveUsage,'19');window.print=()=>{throw new Error('Welcome preview must not print');};},{config,keys:EVENT_KEYS});
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  for(const [type,template]of [['other','champagne'],['graduation','grad-gala']]){
   await page.goto(base+'/?event=oct10-2026',{waitUntil:'networkidle'});
   await page.evaluate(({keys,type,template})=>{const saved=JSON.parse(localStorage.getItem(keys.config));saved.type=type;saved.defaultTemplate=template;saved.details={...saved.details,graduate:'Taylor',classYear:'2027'};localStorage.setItem(keys.config,JSON.stringify(saved));},{keys:EVENT_KEYS,type,template});
   await page.reload({waitUntil:'networkidle'});await page.getByTestId('welcome-four-photo').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid="welcome-four-photo"]')?.disabled);await assertPhotoOnly(page);
   for(const id of ['welcome-quick-photo','welcome-four-photo']){
    const button=page.getByTestId(id);assert(await button.isEnabled());
    const svg=button.locator('.bwLayoutPreview svg');assert.equal(await svg.getAttribute('data-design'),type+'-'+template);
    await page.waitForFunction(()=>[...document.querySelectorAll('.bwLayoutPreview')].length===3&&[...document.querySelectorAll('.bwLayoutPreview')].every(e=>e.dataset.examplePoses==='ready'));assert.equal(await svg.locator('[data-guest-photo="true"]').count(),id==='welcome-quick-photo'?1:4,'sample portraits fill the actual printable photo openings');
    assert((await button.locator('.bwPreviewCaption').innerText()).includes('4×6 print'));
   }
   if(type==='other')assert.equal(await page.getByTestId('welcome-four-photo').locator('[data-approved-photo-region="true"]').count(),1,'four-photo choice uses coordinated approved layout');
   await page.getByTestId('welcome-quick-photo').click();assert.equal(await page.getByTestId('welcome-large-proof').getAttribute('data-selected-photos'),'1');await page.getByTestId('welcome-four-photo').click();assert.equal(await page.getByTestId('welcome-large-proof').getAttribute('data-selected-photos'),'4');assert.equal(await page.locator('.pcStage').count(),0,'selecting a layout does not start capturing');
   assert.equal(await page.locator('.bwWelcome a').count(),0,'approved guests have no setup, designs or external navigation');
   assert.equal(await page.locator('.workspaceBanner').count(),0);assert.equal(await page.getByTestId('app-update').count(),0);
   assert(await page.getByTestId('welcome-staff-tools').isVisible());
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),EVENT_KEYS.liveUsage),'19');
   await page.screenshot({path:`${out}/${engine}-approved-${type}-choices.png`});
   results.push({test:engine+'-approved-'+type+'-actual-matching-layout-choices',passed:true});
  }
  assert.deepEqual(errors,[]);
 }finally{await context.close();}
}
let browser;
try{
 for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
  browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}: {})});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',...(engine==='chromium'?{permissions:['camera']}: {})});await setup(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [label,w,h] of [['desktop',1440,900],['laptop',1366,650],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640],['short-screen',1024,600],['zoom-reflow',640,720]])await layout(page,`${engine}-${label}`,w,h);
  await approvedWelcome(browser,engine);
  await page.setViewportSize({width:1366,height:768});await open(page);
  await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});assert((await page.locator('.bwConnection').textContent()).includes('Offline'));results.push({test:engine+'-offline-indicator',passed:true});
  await open(page);await page.getByRole('button',{name:'Add to iPad',exact:true}).click();await page.getByRole('dialog',{name:'Install on iPad'}).waitFor();await page.getByRole('button',{name:'Close instructions'}).click();results.push({test:engine+'-install-dialog',passed:true});
  const staff=page.getByTestId('welcome-staff-tools');
  await staff.click();await page.getByRole('dialog',{name:'Staff access',exact:true}).waitFor();
  await page.getByTestId('staff-cancel').click();
  assert.equal(await page.getByRole('dialog',{name:'Staff access'}).count(),0);
  await staff.click();await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog',{name:'Staff access'}).count(),0);
  await staff.click();await page.getByTestId('staff-confirm').click();
  await page.getByRole('dialog',{name:'Operator controls',exact:true}).waitFor();
  assert((await page.locator('.operatorPanel').textContent()).includes('209'));
  assert.equal(await page.locator('.operatorQuickCard').count(),8);
  const awakeToggle=page.getByTestId('operator-awake-toggle');
  assert(await awakeToggle.isChecked(),'guest display stays awake by default');
  await awakeToggle.uncheck();
  assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-screen-awake-v1')),'off');
  assert((await page.getByTestId('operator-awake-status').innerText()).includes('Off by staff choice'));
  await awakeToggle.check();
  assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-screen-awake-v1')),'on');
  await page.getByTestId('operator-lock-ipad').click();
  assert.equal(await page.getByTestId('operator-guided-access').getAttribute('open'),'');
  assert((await page.getByTestId('operator-guided-access').innerText()).includes('Display Auto-Lock'));
  assert.equal(await page.getByTestId('operator-load-event').getAttribute('href'),'/staff/start','staff choose the layout directly in the booth');
  assert((await page.getByTestId('operator-load-event').innerText()).includes('Choose layout'));
  assert(await page.getByTestId('operator-reset-guest').isVisible());
  assert(await page.getByTestId('operator-sound-test').isVisible());
  assert((await page.getByTestId('operator-sound-test').innerText()).includes('Play voice sample'));
  assert.equal(await page.getByRole('link',{name:/Advanced local setup/}).getAttribute('href'),'/setup');
  await page.screenshot({path:`${out}/${engine}-staff-tools.png`});
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  assert.equal(await page.getByRole('dialog',{name:'Operator controls'}).count(),0);
  results.push({test:engine+'-one-tap-staff-confirmation-and-working-operator-dashboard',passed:true});
  // Simulate security enabled without configuring a real production credential.
  await page.route('**/api/staff/unlock',route=>route.fulfill({json:{required:true}}));
  await staff.click();
  await page.getByTestId('staff-pin-form').waitFor();
  const staffPinInput=page.locator('#bwStaffPin');
  assert.equal(await staffPinInput.getAttribute('maxlength'),'4');
  assert.equal(await staffPinInput.getAttribute('minlength'),'4');
  await staffPinInput.fill('4826'); // Test-only number, not the owner's PIN.
  assert(await page.getByTestId('staff-confirm').isEnabled());
  await page.getByTestId('staff-cancel').click();
  await page.unroute('**/api/staff/unlock');
  results.push({test:engine+'-four-digit-staff-gate-without-exposing-credential',passed:true});
  await staff.click();await page.getByTestId('staff-confirm').click();
  await page.getByRole('link',{name:/Event setup/}).click();await page.waitForURL('**/setup');
  await page.getByTestId('premium-event-setup').waitFor();
  assert.equal(await page.getByTestId('setup-one-photo').getAttribute('aria-pressed'),'false');
  await page.getByTestId('setup-pause-seconds').selectOption('9');
  await page.getByRole('button',{name:/Next: personalize/}).click();
  assert.equal(await page.locator('.ksLookCard').count(),4,'Other keeps its three saved designs plus Royal Quinceañera');
  assert.equal(await page.locator('.ksPaletteGrid button').count(),6);
  await page.getByTestId('setup-preview-strip').click();
  await page.waitForFunction(()=>document.querySelector('.ksPreviewPaper svg')?.getAttribute('data-layout')==='photo_strip');
  assert.equal(await page.getByTestId('setup-preview-strip').getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByTestId('setup-strip-single').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.ksPreviewPaper svg').getAttribute('data-strip-mode'),'single');
  assert.equal(await page.locator('.ksPreviewPaper svg image[preserveAspectRatio="xMidYMid slice"]').count(),4);
  await page.getByTestId('setup-strip-double').click();
  assert.equal(await page.getByTestId('setup-strip-double').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.ksPreviewPaper svg image[data-guest-photo]').count(),8);
  await page.getByTestId('setup-preview-card').click();
  await page.getByTestId('setup-look-blush').click();
  await page.getByTestId('setup-palette-rose').click();
  await page.waitForFunction(()=>document.querySelector('.ksPreviewPaper svg')?.getAttribute('data-design')==='other-blush');
  assert.equal(await page.getByTestId('setup-look-blush').getAttribute('aria-pressed'),'true');
  assert.equal(await page.getByTestId('setup-palette-rose').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.ksPreviewPaper svg [data-event-color-trim="true"]').count(),1);
  await page.waitForFunction(()=>Boolean(document.querySelector('.ksPreviewPaper svg image[data-guest-photo]')));
  results.push({test:engine+'-real-designs-palettes-and-illustrative-preview',passed:true});
  await page.setViewportSize({width:390,height:844});
  const setupMobile=await page.locator('.ksWowPreview').evaluate(e=>{
   const b=e.getBoundingClientRect();
   return {visible:getComputedStyle(e).display!=='none',width:b.width,height:b.height};
  });
  assert(setupMobile.visible&&setupMobile.width>250&&setupMobile.height>=90);
  await page.screenshot({path:`${out}/${engine}-premium-setup-mobile.png`,fullPage:true});
  await page.setViewportSize({width:1366,height:768});
  await page.getByRole('button',{name:/Occasion & experience/}).click();
  await page.getByTestId('setup-one-photo').click();
  assert.equal(await page.getByTestId('setup-one-photo').getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:/Next: personalize/}).click();
  assert(await page.getByTestId('setup-preview-strip').isDisabled());
  await page.getByRole('button',{name:/Save event & open booth/}).click();
  await page.waitForURL('**/');
  const prepared=await page.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-event-v1')));
  assert.equal(prepared.defaultPhotoExperience,'one');
  assert.equal(prepared.photoPauseSeconds,9);
  assert.equal(prepared.defaultTemplate,'blush');
  assert.equal(prepared.details.primaryColor,'#855665');
  assert.equal(prepared.details.secondaryColor,'#e4b4a1');
  assert.equal(prepared.printLayouts.defaultLayout,'card');
  assert.equal(prepared.photoFit,'fit','an explicitly selected whole-photo setting should be preserved');
  assert.equal(prepared.printLayouts.stripMode,'single');
  assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');
  assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);
  assert.equal(await page.getByTestId('welcome-four-photo').count(),1);
  await page.evaluate(config=>localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config)),cfg);
  await open(page);
  await page.getByRole('link',{name:'Help',exact:true}).click();await page.waitForURL('**/help');results.push({test:engine+'-setup-and-help-navigation',passed:true});
  await open(page);await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('friendly-booth-event-v1'));c.title='A Very Long Family Celebration With Everyone We Love And A Wonderfully Long Event Name';c.details.eventName=c.title;localStorage.setItem('friendly-booth-event-v1',JSON.stringify(c));});await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(250);assert(!await page.evaluate(()=>{const r=document.querySelector('.bwWelcome');return r.scrollWidth>r.clientWidth+1;}));await page.screenshot({path:`${out}/${engine}-long-title.png`,fullPage:true});results.push({test:engine+'-long-event-name',passed:true});
  await page.evaluate(config=>localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...config,mode:'gif',captureMode:'VIDEO',videoEnabled:true,gifEnabled:true})),cfg);await page.goto(base+'/?mode=boomerang',{waitUntil:'networkidle'});await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]');await assertPhotoOnly(page);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');results.push({test:engine+'-legacy-mode-cannot-enable-motion',passed:true});
  await page.evaluate(config=>localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config)),cfg);await open(page);
  if(engine==='chromium'){
   await page.getByTestId('welcome-four-photo').click();await page.getByTestId('welcome-start-session').click();await assertFinishedGuest(page,4);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');assert.equal(await page.evaluate(()=>window.__proofRecordingCalls),0);const savedCapture=await page.evaluate(async source=>{const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();const records=await api.listCaptures('legacy');return {count:records.length,poses:records[0].poses.length,keepsake:records[0].keepsake.size};},archiveSource);assert.deepEqual({count:savedCapture.count,poses:savedCapture.poses},{count:1,poses:4});assert(savedCapture.keepsake>0);results.push({test:'chromium-legacy-four-photo-session-has-one-finished-preview-and-only-print-send-done',passed:true});
   await page.getByTestId('approved-digital-copy').click();await page.getByRole('dialog',{name:'Send your photo.',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');await page.keyboard.press('Escape');
   await page.getByTestId('approved-print').click();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');assert.equal(await page.evaluate(()=>window.__proofPrintCalls),1);assert(await page.getByTestId('approved-print').isDisabled());await page.getByTestId('approved-retry-print').click();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');assert(await page.getByTestId('approved-print').isEnabled());await page.getByTestId('approved-print').click();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');assert.equal(await page.evaluate(()=>window.__proofPrintCalls),2);await page.screenshot({path:`${out}/chromium-photo-preview.png`,fullPage:true});results.push({test:'chromium-simplified-send-and-canceled-print-retry',passed:true,physicalPrinterUsed:false});
   await page.getByRole('button',{name:/^Done/}).click();await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]',{timeout:10000});await assertPhotoOnly(page);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');results.push({test:'chromium-next-guest-photo-only-usage-preserved',passed:true});
   await settleWelcome(page);await page.getByTestId('welcome-quick-photo').click();assert.equal(await page.getByTestId('welcome-large-proof').getAttribute('data-selected-photos'),'1');await page.getByTestId('welcome-start-session').click();await assertFinishedGuest(page,1);assert.equal(await page.evaluate(()=>window.__proofRecordingCalls),0);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');results.push({test:'chromium-legacy-one-photo-session-loads-the-same-preselected-design-without-adjustments',passed:true});await page.getByTestId('approved-done').click();await page.getByTestId('welcome-four-photo').waitFor({timeout:10000});
   await open(page);await page.evaluate(()=>localStorage.setItem('friendly-booth-print-usage-v1','216'));await open(page);assert((await page.locator('.bwChoiceNote').textContent()).includes('Digital photos'));results.push({test:'print-exhaustion-keeps-digital-available',passed:true});
  }
  assert.deepEqual(errors,[]);results.push({test:engine+'-no-browser-errors',passed:true});await browser.close();browser=null;
 }
}catch(error){results.push({test:'failure',passed:false,message:error.message,stack:error.stack});if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0])await pages[0].screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});await browser.close();}console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,base},null,2));
if(!process.exitCode)await import('./event-preparation-proof.mjs');
