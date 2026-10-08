import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
const base=process.env.STRIP_BASE_URL||'http://127.0.0.1:3000',out='strip-proof',results=[];
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
for(let i=0;i<60;i++){try{if((await fetch(base+'/api/app-version')).ok)break;}catch{}if(i===59)throw new Error('Booth server unavailable');await new Promise(r=>setTimeout(r,1000));}
const engines=process.env.STRIP_CHROMIUM_ONLY?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
for(const [engine,api] of engines){
 const browser=await api.launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{} )});
 let context,page;
 const pass=(name,extra={})=>results.push({engine,name,passed:true,...extra});
 async function open({demo=true,failArchive=false}={}){
  if(context)await context.close();
  context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',acceptDownloads:true});
  const cfg=octoberPreset();cfg.guestMode='approved';cfg.defaultTemplate='champagne';cfg.details={...cfg.details,primaryColor:'#164c6b',secondaryColor:'#d8a35b'};
  cfg.preparation={colorsConfirmed:true,checks:{details:true,design:true,camera:true,printer:true,digital:true}};
  await context.addInitScript(({cfg,keys,failArchive})=>{
   localStorage.setItem(keys.config,JSON.stringify(cfg));localStorage.setItem(keys.liveUsage,'17');localStorage.setItem(keys.demoUsage,'4');
   window.__draws=[];window.__prints=0;
   if(failArchive){const put=IDBObjectStore.prototype.put;let failed=false;IDBObjectStore.prototype.put=function(value,...args){if(!failed&&value?.keepsake instanceof ArrayBuffer){failed=true;this.transaction.abort();return;}return put.call(this,value,...args);};}
   window.print=()=>{window.__prints++;setTimeout(()=>window.dispatchEvent(new Event('afterprint')),20);};
   const real=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLVideoElement)window.__draws.push(performance.now());return real.call(this,source,...args);};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
    const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');let n=0;
    const draw=()=>{n++;ctx.fillStyle=['#375b53','#565d83','#86634f'][Math.floor(n/8)%3];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff9df';ctx.font='bold 65px sans-serif';ctx.fillText('POSE '+n,120,250);};
    draw();const stream=c.captureStream(20),tick=setInterval(draw,80);
    const track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(tick);stop();};return stream;
   }}});
  },{cfg,keys:EVENT_KEYS,failArchive});
  page=await context.newPage();page.setDefaultTimeout(15000);page.__errors=[];page.on('pageerror',e=>page.__errors.push(e.message));
  await page.goto(base+'/?event=oct10-2026'+(demo?'&demo=1':''),{waitUntil:'networkidle'});
  await page.getByTestId('welcome-four-photo').waitFor();
 }
 async function capture(total,{saved=true}={}){
  await page.getByTestId(total===1?'welcome-quick-photo':'welcome-four-photo').click();
  await page.locator('.pcStage').waitFor();
  await page.getByTestId('approved-guest-preview').waitFor({timeout:110000});
  await page.getByTestId('approved-finished-jpeg').waitFor({timeout:35000});
  if(saved)await page.waitForFunction(()=>document.querySelector('[data-testid="approved-gallery-status"]')?.textContent?.includes('Digital copy saved'),null,{timeout:25000});
 }
 async function records(scope){return page.evaluate(async ({source,scope})=>{
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
   const rows=await api.listCaptures(scope);
   return rows.map(r=>({id:r.id,poses:r.poses.length,keepsake:r.keepsake?.size||0}));
  },{source:archiveSource,scope});}
 try{
  const version=await (await fetch(base+'/api/app-version')).json();assert.equal(version.version,BOOTH_RELEASE);
  await open();await capture(4);
  assert.equal(await page.locator('.agGuest').getAttribute('data-output-layout'),'photo_strip');
  assert.equal(await page.getByTestId('layout-strip').count(),0);
  assert.equal(await page.locator('.ksGallery').count(),0);
  assert.equal(await page.getByRole('button',{name:/Event setup/}).count(),0);
  assert.equal(await page.locator('.workspaceBanner').count(),0);
  assert(await page.getByTestId('approved-done').isEnabled());
  const file=await page.getByTestId('approved-finished-jpeg').getAttribute('src');
  assert(file?.startsWith('data:image/jpeg;base64,'));
  const bytes=Buffer.from(file.split(',')[1],'base64'),metadata=await sharp(bytes).metadata();
  assert.equal(metadata.width,1200);assert.equal(metadata.height,1800);
  assert.equal(await page.evaluate(()=>window.__draws.length),4);
  const saved=await records('oct10-2026:demo');assert.equal(saved.length,1);assert.equal(saved[0].poses,4);assert(saved[0].keepsake>0);
  pass('four distinct photos become one approved 4x6 JPEG without guest template picker');
  for(const [name,width,height]of[['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   for(const testId of ['approved-print','approved-done','approved-retake','approved-digital-copy']){
    const box=await page.getByTestId(testId).boundingBox();
    assert(box&&box.height>=40&&box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,name+' '+testId+' visible');
   }
   await page.screenshot({path:`${out}/${engine}-${name}-approved.png`});pass('approved-guest-controls-fit-'+name);
  }
  await page.setViewportSize({width:1024,height:768});
  await page.emulateMedia({media:'print'});
  assert(await page.locator('.ksPrintOnly img.ksExactPrintImage').isVisible());
  await page.emulateMedia({media:'screen'});
  await page.getByTestId('approved-digital-copy').click();
  await page.getByRole('dialog',{name:'Get a digital copy.',exact:true}).waitFor();
  const downloadWait=page.waitForEvent('download');await page.getByTestId('approved-download-photo').click();
  const download=await downloadWait;assert.deepEqual(await readFile(await download.path()),bytes);
  assert.equal(await page.locator('.deliveryForm').count(),0);
  await page.keyboard.press('Escape');
  pass('digital-copy-download-matches-the-approved-finished-JPEG-and-preserves-the-print-allowance');
  await page.getByTestId('approved-print').click();
  assert.equal(await page.evaluate(()=>window.__prints),1);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'4');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');
  await page.waitForFunction(()=>document.querySelector('[data-testid="approved-print"]')?.textContent?.includes('Print requested'));
  pass('demo wireless print opens once and never spends paid event allowance');
  await page.getByTestId('approved-done').click();
  await page.getByTestId('welcome-four-photo').waitFor({timeout:12000});
  pass('one-tap done returns to guest welcome without editing event artwork');
  await open();await capture(1);
  assert.equal(await page.locator('.agGuest').getAttribute('data-output-layout'),'card');
  assert.equal((await records('oct10-2026:demo'))[0].poses,1);
  assert.equal(await page.getByTestId('layout-strip').count(),0);
  assert.equal(await page.getByTestId('approved-finished-jpeg').count(),1);
  pass('one-photo mode loads approved card without guest choices');
  await open({demo:false,failArchive:true});
  assert.equal(await page.locator('.workspaceBanner').count(),0);
  assert.equal(await page.getByRole('link',{name:/Edit this booth setup|Event preparation|Navy.*Gold/}).count(),0);
  await capture(1,{saved:false});
  await page.getByTestId('approved-retry-save').waitFor();
  assert(await page.getByTestId('approved-done').isDisabled());
  await page.getByTestId('approved-retry-save').click();
  await page.waitForFunction(()=>document.querySelector('[data-testid="approved-gallery-status"]')?.textContent?.includes('Digital copy saved'),null,{timeout:25000});
  assert(await page.getByTestId('approved-done').isEnabled());
  pass('archive-write-failure-keeps-the-photo-until-retry-succeeds');
  await page.getByTestId('approved-print').click();
  await page.getByTestId('approved-retry-print').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[data-testid="approved-retry-print"]').disabled);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'18');
  await page.getByTestId('approved-retry-print').click();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');
  assert(await page.getByTestId('approved-print').isEnabled());
  await page.getByTestId('approved-print').click();
  assert.equal(await page.evaluate(()=>window.__prints),2);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'18');
  pass('canceled-or-unprinted-request-can-be-retried-without-double-charging-the-allowance');
  assert.deepEqual(page.__errors,[]);
 }catch(err){results.push({engine,passed:false,message:err.message,stack:err.stack});if(page)await page.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});throw err;}
 finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({version:BOOTH_RELEASE,results},null,2));}
}
console.log(JSON.stringify({version:BOOTH_RELEASE,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length}));
