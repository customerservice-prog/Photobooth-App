import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';
const base=process.env.SEQUENCE_BASE_URL||'http://127.0.0.1:3000',out='sequence-proof',smoke=process.env.SEQUENCE_SMOKE==='1',results=[];
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
await mkdir(out,{recursive:true});
for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===59)throw new Error('Booth is not ready');await new Promise(r=>setTimeout(r,1000));}
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});let context,page;
 const pass=(test,extra={})=>results.push({engine,test,passed:true,...extra});
 async function open(total=4){
  if(context)await context.close();context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const cfg=octoberPreset();cfg.printPackage.shotsPerSession=total;
  await context.addInitScript(({cfg,keys})=>{
   localStorage.setItem(keys.config,JSON.stringify(cfg));if(localStorage.getItem(keys.liveUsage)===null)localStorage.setItem(keys.liveUsage,'17');if(localStorage.getItem(keys.demoUsage)===null)localStorage.setItem(keys.demoUsage,'0');
   window.__voiceStarts=[];const AC=window.AudioContext||window.webkitAudioContext;if(AC){const original=AC.prototype.createBufferSource;AC.prototype.createBufferSource=function(...args){const source=original.apply(this,args);const start=source.start;source.start=function(...a){window.__voiceStarts.push({at:performance.now(),duration:source.buffer?.duration,state:source.context.state});return start.apply(this,a);};return source;};}
   window.__cameraCalls=0;window.__cameraDraws=[];window.__frameMetadata=[];
   const originalFrame=HTMLVideoElement.prototype.requestVideoFrameCallback;
   if(originalFrame)HTMLVideoElement.prototype.requestVideoFrameCallback=function(callback){return originalFrame.call(this,(now,meta)=>{window.__frameMetadata.push({mediaTime:meta.mediaTime,presentedFrames:meta.presentedFrames});callback(now,meta);});};window.__captureEvents=[];window.__printCalls=0;
   window.print=()=>{window.__printCalls++;};
   const realDraw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...rest){if(source instanceof HTMLVideoElement)window.__cameraDraws.push({mediaTime:source.currentTime,at:performance.now()});return realDraw.call(this,source,...rest);};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async constraints=>{
    if(constraints.audio!==false)throw new Error('No audio is permitted');window.__cameraCalls++;
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');let frame=0;
    const draw=()=>{frame++;ctx.fillStyle=['#36628a','#6f517d','#437267','#88523e'][Math.floor(frame/7)%4];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff1d2';ctx.font='bold 68px sans-serif';ctx.fillText('LIVE FRAME '+frame,35,220);ctx.fillRect(frame%600,310,20,30);};draw();
    const stream=canvas.captureStream(20),tick=setInterval(draw,70);window.__cameraTrack=stream.getVideoTracks()[0];window.__cameraTick=tick;window.__stopCamera=()=>{clearInterval(tick);stream.getTracks().forEach(t=>t.stop());};return stream;
   }}});
   document.addEventListener('DOMContentLoaded',()=>{
    let last='';new MutationObserver(()=>{const s=document.querySelector('.pcStage');if(!s)return;const value=[s.dataset.phase,s.dataset.shot,s.dataset.completed].join('/');if(value!==last){last=value;window.__captureEvents.push({phase:s.dataset.phase,shot:Number(s.dataset.shot),completed:Number(s.dataset.completed),printVisible:Boolean(document.querySelector('.ksStudio'))});}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-phase','data-shot','data-completed']});
   });
  },{cfg,keys:EVENT_KEYS});
  page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.__errors=errors;
  await page.goto(base+'/?event=oct10-2026&demo=1',{waitUntil:'networkidle'});await page.getByTestId('welcome-four-photo').waitFor();
 }
 async function archive(){return page.evaluate(async source=>{
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();
  const hash=async blob=>blob?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join(''):null;
  const all=await api.listCaptures('oct10-2026:demo');
  return Promise.all(all.map(async record=>({id:record.id,poses:await Promise.all(record.poses.map(hash)),collage:await hash(record.collage),keepsake:await hash(record.keepsake)})));
 },archiveSource);}
 function assertFirstOriginalOnly(records){
  assert.equal(records.length,1,'the first captured original remains in this event archive');
  assert.equal(records[0].poses.length,1,'only the completed first pose was captured');
  assert.match(records[0].poses[0],/^[a-f0-9]{64}$/,'the archived original is a real JPEG with a stable byte hash');
  assert.equal(records[0].collage,null,'an interrupted session never creates an incomplete print collage');
  assert.equal(records[0].keepsake,null,'an interrupted session never creates a finished keepsake');
 }
 try{
  await open();await page.getByTestId('welcome-four-photo').dblclick();await page.locator('.pcStage[data-phase="countdown"]').waitFor();
  const countdownTones=await page.locator('.pcStage[data-phase="countdown"]').evaluate(stage=>{
    const original=stage.dataset.count,digit=stage.querySelector('.pcDigit');
    const colors=[3,2,1].map(number=>{stage.dataset.count=String(number);return getComputedStyle(digit).color;});
    stage.dataset.count=original;return colors;
  });
  assert.equal(new Set(countdownTones).size,3,'three distinct countdown digit colors');pass('three-step-color-changing-countdown',{countdownTones});
  const premium=await page.locator('.pcStage[data-phase="countdown"]').evaluate(stage=>{
    const digit=stage.querySelector('[data-testid="premium-countdown-number"]');
    const halo=stage.querySelector('.pcCircle'),screen=stage.getBoundingClientRect();
    const box=digit?.getBoundingClientRect();
    return {value:digit?.textContent,font:digit?parseFloat(getComputedStyle(digit).fontSize):0,
      haloWidth:halo?.getBoundingClientRect().width,x:box?.x-screen.x,y:box?.y-screen.y,
      w:box?.width,h:box?.height,sw:screen.width,sh:screen.height,
      cameraZ:Number(getComputedStyle(stage.querySelector('.pcCamera')).zIndex),
      shadeZ:Number(getComputedStyle(stage.querySelector('.pcShade')).zIndex),
      overlayZ:Number(getComputedStyle(stage.querySelector('.pcCenter')).zIndex),
      title:stage.querySelector('.pcWords h1')?.textContent};
  });
  assert(['3','2','1'].includes(premium.value),'countdown number must be present');
  assert(premium.font>=160&&premium.haloWidth>=275,'number must be large and fancy');
  assert(premium.cameraZ>=0&&premium.shadeZ>premium.cameraZ&&premium.overlayZ>premium.shadeZ,'overlay must be above live camera');
  assert(premium.x>=-1&&premium.y>=-1&&premium.x+premium.w<=premium.sw+1&&premium.y+premium.h<=premium.sh+1,'number must be visible on screen');
  assert.equal(premium.title,'Listen…');
  pass('large-countdown-visible-above-camera',{premium});
  assert.equal(await page.locator('.pcDigit').evaluate(e=>getComputedStyle(e).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.locator('.pcDigit').evaluate(e=>getComputedStyle(e).animationName),'pcNumberIn');pass('animated-countdown-respects-reduced-motion');
  for(const [name,width,height] of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640],['phone-landscape',844,390]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(80);
   const geometry=await page.locator('.pcStage').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight}));assert(geometry.sw<=geometry.w+1,name+' horizontal fit');assert(geometry.sh<=geometry.h+1,name+' vertical fit');
   for(const control of await page.locator('.pcFooterBar button,.pcFooterBar a').all()){const b=await control.boundingBox();assert(b.y>=0&&b.y+b.height<=height+1);assert(b.height>=44);const covered=await control.evaluate(e=>{const b=e.getBoundingClientRect();return !e.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));});assert(!covered,name+' uncovered controls');}

   const haloBounds=await page.locator('.pcCircle').evaluate(e=>{
     const box=e.getBoundingClientRect(),root=e.closest('.pcStage').getBoundingClientRect();
     return {x:box.x-root.x,y:box.y-root.y,w:box.width,h:box.height,sw:root.width,sh:root.height};
   });
   assert(haloBounds.w>=120&&haloBounds.h>=120,name+' countdown too small');
   assert(haloBounds.x>=-1&&haloBounds.y>=-1&&haloBounds.x+haloBounds.w<=haloBounds.sw+1&&haloBounds.y+haloBounds.h<=haloBounds.sh+1,name+' countdown clipped');
   await page.screenshot({path:`${out}/${engine}-${name}-countdown.png`});pass('countdown-layout-'+name,{geometry});
  }
  await page.setViewportSize({width:1366,height:768});await page.locator('.pcStage[data-phase="smile"]').waitFor();await page.screenshot({path:`${out}/${engine}-smile-cue.png`});await page.waitForFunction(()=>Number(document.querySelector('.pcStage')?.dataset.completed)>=1);const completed=Number(await page.locator('.pcStage').getAttribute('data-completed'));assert.equal(await page.locator('.ksStudio').count(),0);assert.equal(await page.locator('.pcStrip img').count(),completed);await page.screenshot({path:`${out}/${engine}-first-real-photo.png`});await page.locator('.pcStage[data-phase="next"][data-shot="2"]').waitFor({timeout:10000});assert((await page.locator('.pcWords').innerText()).includes('Change your pose!'));assert((await page.locator('.pcWords').innerText()).includes('PHOTO 2 OF 4 IS NEXT'));await page.screenshot({path:`${out}/${engine}-next-photo-reminder.png`});pass('big-visible-next-photo-pose-reminder');
  await page.locator('.pcStage[data-phase="pause"][data-shot="2"]').waitFor({timeout:15000});
  assert.equal(await page.getByTestId('pose-break').count(),1);
  const secondsShown=await page.locator('.pcPoseTimer strong').textContent();
  assert(Number(secondsShown)>=1&&Number(secondsShown)<=6,'pose break shows remaining seconds');
  assert((await page.locator('.pcWords').innerText()).includes('next pose'));
  await page.getByRole('button',{name:/I’m ready — start countdown/}).click();
  await page.locator('.pcStage[data-phase="countdown"][data-shot="2"]').waitFor({timeout:15000});
  pass('guest-can-pause-between-photos-and-start-countdown-when-ready');
  await assertFinishedGuest(page,4);const draws=await page.evaluate(()=>window.__cameraDraws),events=await page.evaluate(()=>window.__captureEvents);
  assert.equal(draws.length,4);const voice=await page.evaluate(()=>window.__voiceStarts);assert.equal(voice.length,23);assert(voice.every(v=>v.state==='running'&&v.duration>0));assert.deepEqual(events.filter(e=>e.phase==='next').map(e=>[e.shot,e.completed]),[[2,1],[3,2],[4,3]]);pass('decoded-voice-playback-and-three-next-photo-announcements',{voice});for(let i=1;i<4;i++){assert(draws[i].at-draws[i-1].at>=3000);}
  assert.deepEqual([...new Set(events.filter(e=>e.phase==='smile').map(e=>e.shot))],[1,2,3,4]);assert(events.every(e=>!e.printVisible));assert.equal(await page.evaluate(()=>window.__cameraCalls),1);
  const metadata=await page.evaluate(()=>window.__frameMetadata);assert(metadata.length>=4);assert(new Set(metadata.map(m=>m.presentedFrames)).size>=4||new Set(metadata.map(m=>m.mediaTime)).size>=4,'four new presented frames');
  const saved=await archive();assert.equal(saved.length,1);assert.equal(saved[0].poses.length,4);assert.equal(new Set(saved[0].poses).size,4);
  assert.equal(await page.evaluate(()=>window.__printCalls),0);assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'0');
  assert.equal(await page.evaluate(()=>window.__cameraTrack.readyState),'ended');assert.deepEqual(page.__errors,[]);
  await page.screenshot({path:`${out}/${engine}-four-different-photos-preview.png`});pass('four-unique-camera-frames-before-print-page',{draws,events,metadata,photoHashes:saved[0].poses});pass('double-tap-one-camera-session');pass('capture-does-not-print-or-use-allowance');
  if(!smoke){
   await open();await page.getByTestId('welcome-four-photo').click();await page.locator('.pcStage[data-completed="1"]').waitFor();
   const beforeCancel=await archive();assertFirstOriginalOnly(beforeCancel);
   await page.getByRole('button',{name:'Cancel session',exact:true}).click();await page.getByTestId('welcome-four-photo').waitFor();await page.waitForTimeout(4400);
   assert.equal(await page.evaluate(()=>window.__cameraDraws.length),1);assert.equal(await page.locator('.ksStudio').count(),0);
   const canceled=await archive();assertFirstOriginalOnly(canceled);assert.deepEqual(canceled,beforeCancel,'cancellation preserves the exact original and creates no late photos or print files');
   assert.equal(await page.evaluate(()=>window.__cameraTrack.readyState),'ended');pass('cancel-after-first-photo-preserves-original-without-late-captures-or-incomplete-sheet',{photoHash:canceled[0].poses[0]});
   await open();await page.getByTestId('welcome-quick-photo').click();await assertFinishedGuest(page,1);const quick=await archive();assert.equal(quick.length,1);assert.equal(quick[0].poses.length,1);assert.equal(await page.evaluate(()=>window.__cameraDraws.length),1);assert.equal(await page.getByTestId('layout-strip').count(),0);pass('quick-session-captures-one-photo-and-stays-card-only');
   await open();await page.getByTestId('welcome-four-photo').click();await page.locator('.pcStage[data-completed="1"]').waitFor();
   const beforeInterruption=await archive();assertFirstOriginalOnly(beforeInterruption);
   await page.evaluate(()=>window.__stopCamera());/* Spoken next-pose + ready + 3/2/1 + smile prompts run before the next camera-frame check. */await page.getByTestId('welcome-four-photo').waitFor({timeout:40000});
   assert((await page.locator('.boothAlert').innerText()).includes('camera stopped'));
   const interrupted=await archive();assertFirstOriginalOnly(interrupted);assert.deepEqual(interrupted,beforeInterruption,'camera interruption preserves the exact completed original');
   assert.equal(await page.evaluate(()=>window.__cameraDraws.length),1);assert.equal(await page.locator('.ksStudio').count(),0);pass('camera-interruption-preserves-original-without-showing-or-saving-incomplete-sheet',{photoHash:interrupted[0].poses[0]});
   const beforeBackground=await archive();
   await page.getByTestId('welcome-four-photo').click();await page.locator('.pcStage[data-phase="countdown"]').waitFor();await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await page.getByTestId('welcome-four-photo').waitFor();await page.waitForTimeout(4400);
   assert((await page.locator('.boothAlert').innerText()).includes('background'));assert.equal(await page.evaluate(()=>window.__cameraTrack.readyState),'ended');
   assert.equal(await page.evaluate(()=>window.__cameraDraws.length),1,'a backgrounded countdown never captures a stale or late frame');
   assert.deepEqual(await archive(),beforeBackground,'backgrounding leaves the earlier partial session intact and creates no empty or late session');pass('backgrounding-stops-session-without-bursting-stale-timers-or-changing-earlier-original');
  }
 }catch(error){if(page)await page.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});const diagnostic=page?await page.evaluate(()=>({draws:window.__cameraDraws,metadata:window.__frameMetadata,events:window.__captureEvents,alert:document.querySelector('.boothAlert')?.textContent})).catch(()=>null):null;results.push({engine,passed:false,message:error.message,stack:error.stack,diagnostic});throw error;}finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({base,smoke,results},null,2));}
}
console.log(JSON.stringify({base,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
