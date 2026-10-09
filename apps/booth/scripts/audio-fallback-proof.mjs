// Real Chromium/WebKit regression: blocked speaker must not cancel photography.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';

const base=process.env.AUDIO_FALLBACK_BASE_URL||'http://127.0.0.1:3000';
const output='audio-fallback-proof',results=[];
await mkdir(output,{recursive:true});
for(let i=0;i<60;i++){
 try{if((await fetch(base)).ok)break;}catch{}
 if(i===59)throw new Error('Photo Booth server is unavailable.');
 await new Promise(resolve=>setTimeout(resolve,1000));
}
for(const [name,driver] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await driver.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1024,height:768},reducedMotion:'reduce'});
  await context.addInitScript(({config,keys})=>{
   localStorage.setItem(keys.config,JSON.stringify(config));
   if(!localStorage.getItem(keys.demoUsage))localStorage.setItem(keys.demoUsage,'0');
   window.__testCameraStarts=0;
   const BlockedAudioContext=class{
    constructor(){throw new Error('Simulated AudioContext unavailable');}
   };
   Object.defineProperty(window,'AudioContext',{configurable:true,value:BlockedAudioContext});
   Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
    getUserMedia:async options=>{
     if(options.audio!==false)throw new Error('Guest photos must never require a microphone.');
     window.__testCameraStarts++;
     const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
     const ctx=canvas.getContext('2d');let tick=0;
     const draw=()=>{tick++;ctx.fillStyle=tick%2?'#396653':'#3f6382';ctx.fillRect(0,0,640,480);ctx.fillStyle='white';ctx.font='64px sans-serif';ctx.fillText('POSE '+tick,105,220);};
     draw();const stream=canvas.captureStream(20),timer=setInterval(draw,80);
     const track=stream.getVideoTracks()[0],stop=track.stop.bind(track);
     track.stop=()=>{clearInterval(timer);stop();};
     return stream;
    }
   }});
  },{config:octoberPreset(),keys:EVENT_KEYS});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const photos of name==='chromium'?[1,4]:[1]){
   await page.goto(base+'/?event=oct10-2026&demo=1',{waitUntil:'networkidle'});
   await page.getByTestId(photos===1?'welcome-quick-photo':'welcome-four-photo').click();
   await page.getByTestId('welcome-start-session').click();
   await page.locator('.pcStage[data-phase="countdown"]').waitFor({timeout:16000});
   assert.match(await page.locator('.pcVoiceBadge').innerText(),/VISUAL PHOTO COUNTDOWN/);
   assert.match(await page.locator('.pcWords').innerText(),/Watch the countdown/);
   assert.equal(await page.getByText('Sound could not start',{exact:false}).count(),0);
   await page.locator('.ksStudio').waitFor({timeout:120000});
   assert.equal(await page.evaluate(()=>window.__testCameraStarts),1);
   await assertFinishedGuest(page,photos);
   assert.deepEqual(errors,[],'No uncaught browser errors');
   await page.screenshot({path:`${output}/${name}-${photos}-photos.png`});
   results.push({browser:name,photos,passed:true});
  }
  await context.close();
 }finally{await browser.close();}
}
await writeFile(output+'/results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({total:results.length,passed:results.every(x=>x.passed),results}));
