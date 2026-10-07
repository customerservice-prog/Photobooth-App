import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';
import {EVENT_KEYS,PREP_CHECKS,octoberPreset,portableSettings} from '../app/lib/event-workspace.mjs';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000',out='welcome-proof';
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const results=[];let browser,page;
const pass=name=>results.push({test:name,passed:true});
const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
function inspectZip(buffer,count){execFileSync('python3',['-c',"import io,json,sys,zipfile\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nassert z.testzip() is None\nm=json.loads(z.read('manifest.json'))\nassert m['sessions']==int(sys.argv[1])\nassert len(z.namelist())==1+5*m['sessions']\nassert all(not n.startswith('/') and '..' not in n for n in z.namelist())",String(count)],{input:buffer});}
try{
 for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
  browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}: {})});
  const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true,reducedMotion:'reduce',...(engine==='chromium'?{permissions:['camera']}: {})});
  await context.addInitScript(keys=>{if(localStorage.getItem(keys.liveUsage)===null)localStorage.setItem(keys.liveUsage,'17');if(localStorage.getItem(keys.demoUsage)===null)localStorage.setItem(keys.demoUsage,'2');window.__printCalls=0;window.print=()=>{window.__printCalls++;window.dispatchEvent(new Event('afterprint'));};},EVENT_KEYS);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await page.getByLabel('Event title',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Event title',{exact:true}).inputValue(),'October 10 Photo Booth Party');assert.equal(await page.getByLabel('Name to show on photos (optional)',{exact:true}).inputValue(),'');await tab('Event check');assert(await page.getByRole('button',{name:'Launch actual event',exact:true}).isDisabled());await tab('Design');pass(engine+'-draft-does-not-invent-customer-or-readiness');
  await page.getByLabel('Primary color',{exact:true}).evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'#334455');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.getByRole('button',{name:/^Save changes/}).click();
  let saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),EVENT_KEYS.config);assert.equal(saved.details.primaryColor,'#334455');assert.equal(saved.printPackage.addOnPrints,108);
  await page.reload({waitUntil:'networkidle'});await tab('Design');assert.equal(await page.getByLabel('Primary color',{exact:true}).inputValue(),'#334455');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'2');pass(engine+'-edits-persist-without-resetting-either-counter');
  await tab('Backups');const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download settings',exact:true}).click();const settingsDownload=await downloadPromise,settingsBuffer=await readFile(await settingsDownload.path());assert.equal(JSON.parse(settingsBuffer).format,'friendly-booth-event-settings');pass(engine+'-portable-settings-download');
  for(const [name,w,h] of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844]]){
   await page.setViewportSize({width:w,height:h});const ok=await page.evaluate(()=>{const r=document.querySelector('.epPage');return r.scrollWidth<=r.clientWidth+1;});assert(ok,engine+' '+name+' preparation has no horizontal overflow');await page.screenshot({path:`${out}/prep-${engine}-${name}.png`,fullPage:true});pass(engine+'-preparation-'+name);
  }
  await page.setViewportSize({width:1366,height:768});await page.getByRole('button',{name:'Try office demo →',exact:true}).click();await page.waitForURL('**/?event=oct10-2026&demo=1');await page.getByTestId('welcome-four-photo').waitFor();
  assert((await page.locator('.workspaceBanner').innerText()).includes('OFFICE DEMO'));assert.equal(await page.getByRole('link',{name:'Event setup',exact:true}).getAttribute('href'),'/event-prep');assert((await page.locator('.bwEventMeta').innerText()).includes('4 PM–8 PM'));assert.equal(await page.locator('.bwSessionChoices button').count(),2);assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);assert.equal(await page.getByTestId('welcome-four-photo').count(),1);pass(engine+'-demo-navigation-and-new-york-event-time');
  await page.screenshot({path:`${out}/prep-${engine}-office-demo.png`,fullPage:true});
  if(engine==='chromium'){
   await page.getByTestId('welcome-four-photo').click();await page.locator('.ksStudio').waitFor({timeout:30000});await page.getByRole('button',{name:'Try demo print',exact:true}).click();assert.equal(await page.evaluate(()=>window.__printCalls),0);assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'3');assert(await page.getByRole('button',{name:'Demo print complete',exact:true}).isDisabled());pass('chromium-demo-print-is-simulated-and-does-not-use-real-allowance');
   await page.getByRole('button',{name:'Digital Copy',exact:true}).click();await page.getByRole('dialog',{name:'Get a digital copy.',exact:true}).waitFor();assert((await page.getByRole('dialog',{name:'Get a digital copy.',exact:true}).innerText()).includes('Direct customer messages are disabled'));await page.keyboard.press('Escape');pass('chromium-demo-does-not-offer-direct-customer-messages');
   await page.getByRole('button',{name:/^Done/}).click();await page.waitForSelector('.bwWelcome[data-capture-mode="photo"]',{timeout:10000});
   await page.goto(base+'/oct10-demo',{waitUntil:'networkidle'});await page.waitForURL('**/?event=oct10-2026&demo=1');await page.getByTestId('welcome-four-photo').waitFor();assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'3');assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).details.primaryColor,EVENT_KEYS.config),'#334455');pass('chromium-original-demo-link-preserves-edits-and-counters');
   await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await tab('Backups');const zipWait=page.waitForEvent('download');await page.getByRole('button',{name:'Download demo photos',exact:true}).click();const d=await zipWait,b=await readFile(await d.path());inspectZip(b,1);await writeFile(`${out}/demo-export-verified.zip`,b);pass('chromium-all-four-poses-and-finished-keepsake-export-as-valid-zip');
  }
  // Execute the actual archive module in the real browser (no mocked IndexedDB).
  const archiveProof=await page.evaluate(async source=>{
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture,saveKeepsake,listCaptures,archiveCount,exportPhotos};')();
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#334455';ctx.fillRect(0,0,32,32);const photo=canvas.toDataURL('image/jpeg');
   for(let i=0;i<23;i++)await api.saveCapture('proof-retention','id-'+i,photo,[photo,photo,photo,photo],{title:'TEST ONLY'});
   await api.saveCapture('proof-isolation','separate',photo,[photo,photo,photo,photo],{title:'TEST ONLY'});
   const records=await api.listCaptures('proof-retention');await api.saveKeepsake('proof-retention','id-0',records[0].collage);
   let missingRejected=false;try{await api.saveKeepsake('proof-retention','missing',records[0].collage);}catch{missingRejected=true;}
   const exported=await api.exportPhotos('proof-retention');
   return {retained:await api.archiveCount('proof-retention'),separate:await api.archiveCount('proof-isolation'),firstPresent:records.some(r=>r.id==='id-0'),missingRejected,zip:Array.from(new Uint8Array(await exported.blob.arrayBuffer()))};
  },archiveSource);
  assert.equal(archiveProof.retained,23);assert.equal(archiveProof.separate,1);assert(archiveProof.firstPresent);assert(archiveProof.missingRejected);inspectZip(Buffer.from(archiveProof.zip),23);pass(engine+'-all-23-sessions-retained-isolated-and-zip-validated');
  await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await tab('Event check');await page.getByLabel('These are the customer’s confirmed colors, not just preview colors.').check();for(const label of Object.values(PREP_CHECKS))await page.getByLabel(label,{exact:true}).check();assert(await page.getByRole('button',{name:'Launch actual event',exact:true}).isEnabled());pass(engine+'-manual-approvals-enable-launch-only-when-complete');
  await page.getByRole('button',{name:/^Save changes/}).click();await tab('Details');await page.getByLabel('Printed caption (optional)',{exact:true}).fill('Test wording only');await tab('Event check');assert(await page.getByRole('button',{name:'Launch actual event',exact:true}).isDisabled());pass(engine+'-changed-design-invalidates-old-approvals');
  // Import is a review step, and neither it nor Save changes alters usage or photos.
  await page.getByTestId('settings-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:settingsBuffer});await page.getByRole('button',{name:/^Save changes/}).click();assert(await page.getByRole('button',{name:'Launch actual event',exact:true}).isDisabled());assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),engine==='chromium'?'3':'2');pass(engine+'-settings-import-preserves-photos-and-counters');
  await page.goto(base+'/?event=oct10-2026',{waitUntil:'networkidle'});await page.waitForURL('**/event-prep');pass(engine+'-unreviewed-live-launch-returns-to-preparation');
  assert.deepEqual(errors,[]);pass(engine+'-no-uncaught-browser-errors');await browser.close();browser=null;
 }
}catch(error){results.push({test:'failure',passed:false,error:error.message,stack:error.stack});if(page)await page.screenshot({path:`${out}/prep-failure.png`,fullPage:true}).catch(()=>{});if(browser)await browser.close();await writeFile(`${out}/prep-results.json`,JSON.stringify({base,results},null,2));throw error;}
await writeFile(`${out}/prep-results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({eventPreparationChecks:results.length,failed:0,base}));
