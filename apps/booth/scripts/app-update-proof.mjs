import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
const base=process.env.UPDATE_BASE_URL||'http://127.0.0.1:3000',out='update-proof',results=[];
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
await mkdir(out,{recursive:true});
for(let n=0;n<60;n++){try{if((await fetch(base+'/api/app-version')).ok)break;}catch{}if(n===59)throw new Error('App unavailable');await new Promise(r=>setTimeout(r,1000));}
const current={app:'friendly-photo-booth',schema:1,version:BOOTH_RELEASE,label:'Verified test metadata'};
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});let page,context;
 const pass=(name,extra={})=>results.push({engine,name,passed:true,...extra});
 try{
  context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
  await context.addInitScript(()=>{
   window.__printCalls=0;window.__cameraCalls=0;window.print=()=>{window.__printCalls++;};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
    window.__cameraCalls++;const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');let n=0;
    const draw=()=>{n++;x.fillStyle=n%2?'#3b7054':'#43617a';x.fillRect(0,0,640,480);x.fillStyle='white';x.font='60px sans-serif';x.fillText('POSE '+n,100,210);};draw();const s=c.captureStream(20),tick=setInterval(draw,80);const t=s.getVideoTracks()[0],stop=t.stop.bind(t);t.stop=()=>{clearInterval(tick);stop();};return s;
   }}});
  });
  page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const res=await page.request.get(base+'/api/app-version');assert.equal(res.status(),200);assert.match(res.headers()['cache-control'],/no-store/);assert.equal((await res.json()).version,BOOTH_RELEASE);pass('live-version-endpoint-is-current-and-not-cacheable');
  await page.goto(base+'/ipad',{waitUntil:'networkidle'});assert.equal(await page.locator('.blPage').getAttribute('data-launch-version'),BOOTH_RELEASE);
  const cfg=octoberPreset();cfg.title='Keep my October event';
  await page.evaluate(async({cfg,keys,source})=>{
   localStorage.setItem(keys.config,JSON.stringify(cfg));localStorage.setItem(keys.liveUsage,'17');localStorage.setItem(keys.demoUsage,'4');localStorage.setItem('update-sentinel','do-not-touch');
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture};')(),c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');x.fillStyle='#426444';x.fillRect(0,0,32,32);const jpeg=c.toDataURL('image/jpeg');
   await api.saveCapture('oct10-2026:live','update-live-sentinel',jpeg,[jpeg,jpeg,jpeg,jpeg],cfg);await api.saveCapture('oct10-2026:demo','update-demo-sentinel',jpeg,[jpeg,jpeg,jpeg,jpeg],cfg);
  },{cfg,keys:EVENT_KEYS,source:archiveSource});
  await page.getByTestId('launch-demo').click();await page.getByTestId('welcome-four-photo').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid=app-update]')?.disabled);
  async function snapshot(){return page.evaluate(async source=>{
   // Compare stored bytes directly, not temporary Blob handles affected by
   // WebKit's offline transport emulation. No photo is rewritten to test it.
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {openArchive};')(),db=await api.openArchive();let records;
   try{records=await new Promise((resolve,reject)=>{const tx=db.transaction('captures','readonly'),req=tx.objectStore('captures').getAll();let rows;req.onsuccess=()=>{rows=req.result;};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Snapshot interrupted'));});}finally{db.close();}
   const photos=[];
   for(const row of records.filter(r=>['oct10-2026:live','oct10-2026:demo'].includes(r.scope)).sort((a,b)=>a.key.localeCompare(b.key))){
    const {collage,poses,keepsake,...metadata}=row,hashes=[];
    for(const bytes of [collage,...poses,...(keepsake?[keepsake]:[])]){
     if(!(bytes instanceof ArrayBuffer)&&!ArrayBuffer.isView(bytes))throw new Error('Expected the persisted JPEG byte buffer.');
     hashes.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(','));
    }
    photos.push({...metadata,hashes,hasKeepsake:Boolean(keepsake)});
   }
   return {storage:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),photos};
  },archiveSource);}
  const before=await snapshot();assert.equal(before.photos.length,2);assert(before.photos.every(r=>r.hashes.length===5));await page.getByTestId('app-update').click();const dialog=page.getByRole('dialog',{name:'Update Friendly Booth'});await dialog.waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid=app-update-load]')?.disabled);assert((await dialog.innerText()).includes(BOOTH_RELEASE));
  for(const [name,width,height] of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640],['phone-landscape',844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(80);const b=await dialog.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,name+' dialog inside viewport');assert(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await page.getByTestId('app-update-load').scrollIntoViewIfNeeded();const control=await page.getByTestId('app-update-load').boundingBox();assert(control.height>=44);await page.screenshot({path:`${out}/${engine}-${name}.png`});pass('update-dialog-'+name);
  }
  await page.setViewportSize({width:1024,height:768});const previousUrl=page.url();await page.getByTestId('app-update-load').click();await page.waitForURL(u=>u.toString()!==previousUrl&&u.searchParams.get('boothv')===BOOTH_RELEASE&&u.searchParams.has('refresh'));await page.waitForLoadState('networkidle');await page.getByTestId('welcome-four-photo').waitFor();assert.equal(new URL(page.url()).searchParams.get('event'),'oct10-2026');assert.equal(new URL(page.url()).searchParams.get('demo'),'1');assert.deepEqual(await snapshot(),before);pass('manual-update-retains-event-demo-both-counters-and-all-photo-bytes');
  const stable=page.url();
  await context.route('**/api/app-version?*',route=>route.fulfill({json:{...current,version:'2026.10.07.99'}}));
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await page.locator('.buDot').waitFor();await page.waitForTimeout(250);assert.equal(page.url(),stable);pass('new-release-is-offered-without-automatic-reload');await context.unroute('**/api/app-version?*');
  await context.setOffline(true);await page.getByTestId('app-update').click();await page.waitForFunction(()=>document.querySelector('.buStatus')?.textContent.includes('offline'));assert.equal(page.url(),stable);assert.deepEqual(await snapshot(),before);await page.getByRole('button',{name:'Close update',exact:true}).click();await context.setOffline(false);pass('offline-update-keeps-page-and-data');
  await context.route('**/api/app-version?*',route=>route.fulfill({status:503,body:'temporary internal failure'}));await page.getByTestId('app-update').click();await page.waitForFunction(()=>document.querySelector('.buStatus')?.textContent.includes('Could not check'));assert.equal(page.url(),stable);await page.getByRole('button',{name:'Close update',exact:true}).click();await context.unroute('**/api/app-version?*');pass('server-error-does-not-navigate-or-claim-update');
  await context.route('**/api/app-version?*',route=>route.fulfill({json:{...current,version:'2026.10.07.2'}}));await page.getByTestId('app-update').click();await page.waitForFunction(()=>document.querySelector('.buStatus')?.textContent.includes('still being deployed'));assert.equal(page.url(),stable);await page.getByRole('button',{name:'Close update',exact:true}).click();await context.unroute('**/api/app-version?*');pass('older-server-response-does-not-downgrade-open-app');
  await page.getByTestId('app-update').click();await page.waitForFunction(()=>!document.querySelector('[data-testid=app-update-load]')?.disabled);
  let releaseResponse;const waiting=new Promise(r=>{releaseResponse=r;});await context.route('**/api/app-version?*',async route=>{await waiting;await route.fulfill({json:current}).catch(()=>{});});
  await page.getByTestId('app-update-load').click();await page.getByRole('button',{name:'Close update',exact:true}).click();await page.getByTestId('welcome-four-photo').click();await page.locator('.pcStage').waitFor();releaseResponse();await page.waitForTimeout(350);assert.equal(page.url(),stable);assert.equal(await page.getByTestId('app-update').count(),0);await page.locator('.ksStudio').waitFor({timeout:105000});assert.equal(await page.getByTestId('app-update').count(),0);assert.equal(await page.evaluate(()=>window.__printCalls),0);assert.equal(await page.evaluate(()=>window.__cameraCalls),1);pass('cancelled-update-cannot-interrupt-later-four-pose-session-or-print-preview');
  assert.deepEqual(errors,[]);
  const native=await browser.newContext({javaScriptEnabled:false});const p=await native.newPage();await p.goto(base+'/bryan-wedding');assert.equal(await p.locator('.blPage').getAttribute('data-launch-version'),BOOTH_RELEASE);assert((await p.getByTestId('launch-demo').getAttribute('href')).includes('demo=1'));await native.close();pass('old-installed-entry-retains-native-links-without-javascript');
 }catch(error){results.push({engine,passed:false,message:error.message,stack:error.stack});if(page)await page.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});throw error;}
 finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({base,version:BOOTH_RELEASE,results},null,2));}
}
console.log(JSON.stringify({base,version:BOOTH_RELEASE,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
