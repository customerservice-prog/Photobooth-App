import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000';
const out='welcome-proof';await mkdir(out,{recursive:true});
const cfg={title:'October 10 Photo Booth Party',subtitle:'Your Photo Booth Preview',date:'October 10, 2026',type:'other',setupComplete:true,defaultTemplate:'champagne',photoFit:'fit',details:{eventName:'October 10 Photo Booth Party',subtitle:'4–8 PM',primaryColor:'#24352f',secondaryColor:'#d8c49b'},printPackage:{includedPrints:108,addOnPrints:108,shotsPerSession:4,copiesPerSession:1,digitalEnabled:true,printingEnabled:true}};
const results=[];
for(let n=0;n<60;n++){try{const r=await fetch(base);if(r.ok)break;}catch{}if(n===59)throw new Error('Server did not become ready');await new Promise(r=>setTimeout(r,1000));}
async function setup(context){await context.addInitScript(config=>{
 if(!localStorage.getItem('friendly-booth-event-v1'))localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config));
 if(!localStorage.getItem('friendly-booth-print-usage-v1'))localStorage.setItem('friendly-booth-print-usage-v1','7');
 window.print=()=>{window.__proofPrintCalls=(window.__proofPrintCalls||0)+1;window.dispatchEvent(new Event('afterprint'));};
 window.__proofRecordingCalls=0;window.MediaRecorder=class{constructor(){window.__proofRecordingCalls++;throw new Error('Motion recording must never be called in a photo-only booth');}};
},cfg);}
async function open(page){await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]');await page.waitForFunction(()=>document.querySelector('#bwEventTitle')?.textContent==='October 10 Photo Booth Party');await page.waitForTimeout(400);}
async function assertPhotoOnly(page){assert.equal(await page.locator('.bwSessionChoices button').count(),2);assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);assert.equal(await page.getByTestId('welcome-four-photo').count(),1);assert.equal(await page.getByTestId('welcome-video').count(),0);assert.equal(await page.getByTestId('welcome-gif').count(),0);assert.equal(await page.locator('.bwPhotoSteps li').count(),3);assert(!/\b(video|gif|boomerang)\b/i.test(await page.locator('.bwWelcome').innerText()));}
async function layout(page,name,w,h){
 await page.setViewportSize({width:w,height:h});await open(page);await assertPhotoOnly(page);assert.equal(await page.locator('h1').count(),1);
 const staffButton=page.getByTestId('welcome-staff-tools'),staffRect=await staffButton.boundingBox();
 assert(await staffButton.isVisible(),name+' staff tools button visible');
 assert(staffRect&&staffRect.height>=44&&staffRect.width>=80&&staffRect.y>=0&&staffRect.y+staffRect.height<=h+1,name+' staff tools reachable without scrolling');
 const data=await page.evaluate(()=>{const root=document.querySelector('.bwWelcome'),footer=document.querySelector('.bwFooter').getBoundingClientRect(),proof=document.querySelector('.bwRealProof').getBoundingClientRect(),back=document.querySelector('.bwPaperBack').getBoundingClientRect(),caption=document.querySelector('.bwProofCaption').getBoundingClientRect(),showcase=document.querySelector('.bwShowcase').getBoundingClientRect();return {clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,innerHeight:innerHeight,clientHeight:root.clientHeight,scrollHeight:root.scrollHeight,footerTop:footer.top,proofBottom:Math.max(proof.bottom,back.bottom),captionTop:caption.top,captionBottom:caption.bottom,showcaseBottom:showcase.bottom,buttons:[...document.querySelectorAll('.bwSessionCard')].map(b=>{const r=b.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,Math.min(r.top+r.height/2,innerHeight-1));return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,covered:r.bottom<=innerHeight&&!b.contains(top)};})};});
 assert(data.scrollWidth<=data.clientWidth+1,name+' no horizontal overflow');assert(data.proofBottom+3<=data.captionTop,name+' proof clear of caption');assert(data.captionBottom<=data.showcaseBottom-8,name+' caption inside panel');
 for(const b of data.buttons){assert(b.left>=-1&&b.right<=w+1);assert(b.height>=44);assert(!b.covered);assert(data.footerTop>=b.bottom-1);if(w>=768&&h>=600)assert(b.top>=0&&b.bottom<=h,name+' primary controls above fold');}
 assert(await page.getByTestId('welcome-staff-tools').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-event-v1')).printPackage.addOnPrints),108);
 await page.screenshot({path:`${out}/${name}.png`,fullPage:true});if(w<621)await page.locator('.bwShowcase').screenshot({path:`${out}/${name}-keepsake.png`});results.push({test:name,passed:true,viewport:[w,h],layout:data});
}
let browser;
try{
 for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
  browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}: {})});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',...(engine==='chromium'?{permissions:['camera']}: {})});await setup(context);
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [label,w,h] of [['desktop',1440,900],['laptop',1366,650],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640],['short-screen',1024,600],['zoom-reflow',640,720]])await layout(page,`${engine}-${label}`,w,h);
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
  await page.getByTestId('operator-load-event').click();
  assert.equal(await page.getByTestId('staff-load-event').getAttribute('open'),'','one tap expands the transfer form');
  assert(await page.getByTestId('staff-event-link').isVisible());
  assert(await page.getByTestId('operator-reset-guest').isVisible());
  assert(await page.getByTestId('operator-sound-test').isVisible());
  assert.equal(await page.getByRole('link',{name:/Event setup/}).getAttribute('href'),'/setup');
  await page.screenshot({path:`${out}/${engine}-staff-tools.png`});
  await page.getByRole('button',{name:'Close controls',exact:true}).click();
  assert.equal(await page.getByRole('dialog',{name:'Operator controls'}).count(),0);
  results.push({test:engine+'-one-tap-staff-confirmation-and-working-operator-dashboard',passed:true});
  await staff.click();await page.getByTestId('staff-confirm').click();
  await page.getByRole('link',{name:/Event setup/}).click();await page.waitForURL('**/setup');
  await page.getByTestId('premium-event-setup').waitFor();
  assert.equal(await page.getByTestId('setup-one-photo').getAttribute('aria-pressed'),'false');
  await page.getByTestId('setup-pause-seconds').selectOption('9');
  await page.getByRole('button',{name:/Next: personalize/}).click();
  assert.equal(await page.locator('.ksLookCard').count(),3);
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
   await page.getByTestId('welcome-four-photo').click();await page.locator('.ksStudio').waitFor({timeout:100000});await page.getByRole('button',{name:'Digital Copy',exact:true}).waitFor({timeout:30000});assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');assert.equal(await page.evaluate(()=>window.__proofRecordingCalls),0);assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-photos-v1'))[0].data.startsWith('data:image/jpeg;base64,')));
   await page.getByRole('button',{name:'Retake',exact:true}).click();await page.locator('.ksStudio').waitFor({timeout:100000});assert.equal(await page.evaluate(()=>window.__proofRecordingCalls),0);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');results.push({test:'chromium-photo-only-capture-and-retake',passed:true});
   await page.getByRole('button',{name:'Digital Copy',exact:true}).click();await page.getByRole('dialog',{name:'Get a digital copy.',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Print 1 Copy',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');assert.equal(await page.evaluate(()=>window.__proofPrintCalls),1);assert(await page.getByRole('button',{name:'Print requested',exact:true}).isDisabled());await page.screenshot({path:`${out}/chromium-photo-preview.png`,fullPage:true});results.push({test:'chromium-simulated-camera-digital-and-one-print-request',passed:true,physicalPrinterUsed:false});
   await page.getByRole('button',{name:/^Done/}).click();await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]',{timeout:10000});await assertPhotoOnly(page);assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');results.push({test:'chromium-next-guest-photo-only-usage-preserved',passed:true});
   await open(page);await page.evaluate(()=>localStorage.setItem('friendly-booth-print-usage-v1','216'));await open(page);assert((await page.locator('.bwChoiceNote').textContent()).includes('Digital photos'));results.push({test:'print-exhaustion-keeps-digital-available',passed:true});
  }
  assert.deepEqual(errors,[]);results.push({test:engine+'-no-browser-errors',passed:true});await browser.close();browser=null;
 }
}catch(error){results.push({test:'failure',passed:false,message:error.message,stack:error.stack});if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0])await pages[0].screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});await browser.close();}console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,base},null,2));
if(!process.exitCode)await import('./event-preparation-proof.mjs');
