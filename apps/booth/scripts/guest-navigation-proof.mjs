import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';

// Isolated fake-camera sessions; no printing, sharing, staff unlock or other writes.
const base=(process.env.GUEST_NAVIGATION_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,''),origin=new URL(base).origin;
const out='guest-navigation-proof',results=[];
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const config={...octoberPreset(),defaultTemplate:'champagne',photoFit:'fit'};
async function snapshot(page){
 return page.evaluate(async source=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
  const rows=await api.listCaptures('oct10-2026:demo');
  return Promise.all(rows.map(async row=>({id:row.id,poses:await Promise.all(row.poses.map(async blob=>Array.from(new Uint8Array(await blob.arrayBuffer())))),finished:row.keepsake?Array.from(new Uint8Array(await row.keepsake.arrayBuffer())):null})));
 },archiveSource);
}
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 let browser,context,page;const errors=[],writes=[];
 try{
  browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true});
  await context.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(!['GET','HEAD'].includes(request.method())){writes.push(request.method()+' '+url.pathname);return route.abort();}
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/api/staff/unlock')return route.fulfill({json:{required:true,configured:true}});
   return route.continue();
  });
  await context.addInitScript(({config,keys})=>{
   localStorage.setItem(keys.config,JSON.stringify(config));localStorage.setItem(keys.demoUsage,'4');
   window.__navigationCameraStarts=0;window.__navigationDraws=0;window.__failExport=true;window.__compressIdle=true;
   window.print=()=>{throw new Error('Navigation proof must not print');};
   Object.defineProperty(navigator,'share',{configurable:true,value:()=>{throw new Error('Navigation proof must not share');}});
   Object.defineProperty(window,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('Visual countdown fixture');}}});
   Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   // Compress the real idle-reset deadline; an export failure must keep the session active.
   const timeout=window.setTimeout.bind(window);window.setTimeout=(callback,delay,...args)=>timeout(callback,window.__compressIdle&&delay===90000?1000:delay,...args);
   const getContext=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(...args){if(window.__failExport&&this.width===1200&&this.height===1800)return null;return getContext.apply(this,args);};
   const toBlob=HTMLCanvasElement.prototype.toBlob;
   HTMLCanvasElement.prototype.toBlob=function(callback,...args){const finished=this.width===1200&&this.height===1800;return toBlob.call(this,blob=>{if(blob&&finished)blob.__navigationFinished=true;callback(blob);},...args);};
   const arrayBuffer=Blob.prototype.arrayBuffer;
   Blob.prototype.arrayBuffer=function(){if(window.__failArchive&&this.__navigationFinished)return Promise.reject(new Error('Archive recovery fixture'));return arrayBuffer.call(this);};
   const drawImage=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLVideoElement)window.__navigationDraws++;return drawImage.call(this,source,...args);};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{
    if(options.audio!==false)throw new Error('Camera fixture must not use the microphone');
    window.__navigationCameraStarts++;
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
    const ctx=canvas.getContext('2d');let frame=0;
    const draw=()=>{frame++;ctx.fillStyle=frame%2?'#276884':'#6e436e';ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff';ctx.font='48px sans-serif';ctx.fillText('FRAME '+frame,60,200);};
    draw();const stream=canvas.captureStream(20),timer=setInterval(draw,70),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);
    track.stop=()=>{clearInterval(timer);stop();};return stream;
   }}});
  },{config,keys:EVENT_KEYS});
  page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?event=oct10-2026&demo=1',{waitUntil:'networkidle'});
  const release=await page.evaluate(async()=>{const response=await fetch('/api/app-version');return (await response.json()).version;});assert.equal(release,BOOTH_RELEASE);
  const home=page.url();
  await page.getByTestId('welcome-four-photo').click();await page.getByTestId('welcome-start-session').click();
  await page.locator('.pcStage[data-completed="1"]').waitFor();
  const original=await snapshot(page);assert.equal(original.length,1);assert.equal(original[0].poses.length,1);
  await page.getByTestId('capture-help').click();const help=page.getByRole('dialog',{name:'Photo session help',exact:true});await help.waitFor();
  assert.equal(page.url(),home,'Help keeps the exact demo/event route');assert.match(await help.innerText(),/countdown continues/);
  await help.getByRole('button',{name:'Back to camera',exact:true}).click();assert.equal(await help.count(),0);
  assert.equal(await page.evaluate(()=>window.__navigationCameraStarts),1,'returning from help keeps the same camera');
  await page.getByTestId('capture-help').click();await page.keyboard.press('Escape');assert.equal(await help.count(),0,'native cancel closes help');
  await page.getByTestId('capture-help').click();await help.getByRole('button',{name:'Cancel session',exact:true}).click();await page.getByTestId('welcome-start-session').waitFor();
  await page.waitForTimeout(250);assert.deepEqual(await snapshot(page),original,'cancel preserves the captured original with no late photos');assert.equal(page.url(),home);
  await page.getByTestId('welcome-quick-photo').click();await page.getByTestId('welcome-start-session').click();
  const retry=page.getByRole('button',{name:'Retry photo',exact:true});await retry.waitFor({timeout:25000});
  const failed=await snapshot(page);assert.equal(failed.length,2);assert(failed.every(row=>row.poses.length===1));
  await page.waitForTimeout(1200);assert.equal(await page.getByTestId('approved-guest-preview').count(),1,'export error survives the compressed idle deadline');
  for(const id of ['approved-print','approved-digital-copy','approved-done'])assert(await page.getByTestId(id).isDisabled());
  await page.getByTestId('approved-error-staff').click();await page.getByTestId('staff-pin-form').waitFor();
  assert.equal(await page.getByRole('dialog',{name:'Operator controls',exact:true}).count(),0,'error recovery still requires the staff PIN');
  await page.getByTestId('staff-cancel').click();assert.equal(await page.getByTestId('approved-guest-preview').count(),1);assert.deepEqual(await snapshot(page),failed,'closing staff access retains originals');
  await page.evaluate(()=>{window.__failExport=false;window.__failArchive=true;window.__compressIdle=false;});await retry.click();
  const retrySave=page.getByTestId('approved-retry-save');await retrySave.waitFor();
  const recovery=page.getByRole('button',{name:'Save recovery JPEG',exact:true});
  const download=page.waitForEvent('download');await recovery.click();const recoveryFile=await download;
  await page.getByTestId('approved-error-staff').click();await page.getByTestId('staff-pin-form').waitFor();
  await page.evaluate(()=>{window.__compressIdle=true;document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
  await page.waitForTimeout(1200);assert.equal(await page.getByTestId('approved-guest-preview').count(),1,'PIN entry holds the photo after a recovery download releases the archive hold');
  await page.evaluate(()=>{window.__compressIdle=false;});await page.getByTestId('staff-cancel').click();
  await page.evaluate(()=>{window.__failArchive=false;});await retrySave.click();
  const jpeg=await assertFinishedGuest(page,1);
  assert.deepEqual(await readFile(await recoveryFile.path()),jpeg,'recovery download preserves the exact finished JPEG');
  const recovered=await snapshot(page);assert(recovered.some(row=>row.finished&&Buffer.from(row.finished).equals(jpeg)),'retry archives the exact finished JPEG');
  assert.equal(await page.evaluate(()=>window.__navigationCameraStarts),2,'retry prepares existing originals without starting another camera');
  assert.equal(await page.getByTestId('approved-error-staff').count(),0,'normal finished screen keeps its three guest actions');
  assert.equal(page.url(),home);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  await page.screenshot({path:`${out}/${engine}-recovered.png`});
  results.push({engine,release,passed:true,helpRetainsSession:true,cancelPreservesOriginal:true,exportErrorRetainsPhoto:true,staffRequiresPin:true,recoveryPinRetainsPhoto:true,retryArchivesExactJPEG:true,cameraStarts:2,writes,errors});
 }catch(error){results.push({engine,passed:false,message:error.message,stack:error.stack,writes,errors});await page?.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});process.exitCode=1;}
 finally{await context?.close();await browser?.close();}
}
await writeFile(`${out}/results.json`,JSON.stringify({base,expectedRelease:BOOTH_RELEASE,results},null,2));
console.log(JSON.stringify({passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,results},null,2));
