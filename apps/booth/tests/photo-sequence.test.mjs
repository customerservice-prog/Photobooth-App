import test from 'node:test';
import assert from 'node:assert/strict';
import {runPhotoSequence,takeFreshPhoto,waitForPose} from '../app/lib/photo-sequence.mjs';
const jpeg='data:image/jpeg;base64,YQ==';
const instant=async()=>{};
test('four separate captures, four countdowns, then and only then processing',async()=>{
 const events=[],calls=[];
 const shots=await runPhotoSequence({total:4,wait:instant,capture:async({index})=>{calls.push(index);return {data:jpeg+index,mediaTime:index+1};},onProgress:e=>events.push(e)});
 assert.deepEqual(calls,[0,1,2,3]);assert.equal(new Set(shots).size,4);
 assert.deepEqual(events.filter(e=>e.phase==='countdown').map(e=>[e.current,e.count]),[1,2,3,4].flatMap(i=>[[i,3],[i,2],[i,1]]));
 assert.deepEqual(events.filter(e=>e.phase==='captured').map(e=>e.completed),[1,2,3,4]);
 assert.deepEqual(events.filter(e=>e.phase==='next').map(e=>e.current),[2,3,4]);
 assert.equal(events.at(-1).phase,'processing');assert.equal(events.at(-1).shots.length,4);assert.equal(events.filter(e=>e.phase==='processing').length,1);
});
test('one-photo quick session captures exactly one image and one talking countdown',async()=>{let n=0;const cues=[];const shots=await runPhotoSequence({total:1,wait:instant,capture:async()=>({data:jpeg,mediaTime:++n}),onCue:c=>cues.push(c)});assert.equal(shots.length,1);assert.equal(n,1);assert.deepEqual(cues,['ready','3','2','1','smile']);});
test('three-photo configuration captures exactly three separate poses',async()=>{let n=0;const shots=await runPhotoSequence({total:3,wait:instant,capture:async()=>({data:jpeg,mediaTime:++n})});assert.equal(shots.length,3);assert.equal(n,3);});
test('still subjects may look identical; advancing camera timestamps remain valid photos',async()=>{let time=0;const shots=await runPhotoSequence({wait:instant,capture:async()=>({data:jpeg,mediaTime:++time})});assert.equal(shots.length,4);});
test('a repeated video frame is rejected rather than copied into another pose',async()=>{const events=[];await assert.rejects(runPhotoSequence({wait:instant,capture:async()=>({data:jpeg,mediaTime:1}),onProgress:e=>events.push(e)}),/new camera photo/);assert(!events.some(e=>e.phase==='processing'));});
test('cancel after one photo stops every later countdown and never returns an incomplete sheet',async()=>{const c=new AbortController();let captures=0;const events=[];await assert.rejects(runPhotoSequence({signal:c.signal,wait:instant,capture:async()=>({data:jpeg,mediaTime:++captures}),onProgress:e=>{events.push(e);if(e.phase==='captured')c.abort();}}),{name:'AbortError'});assert.equal(captures,1);assert(!events.some(e=>e.phase==='processing'));});
test('a late frame after cancellation cannot advance the session',async()=>{const c=new AbortController(),events=[];await assert.rejects(runPhotoSequence({signal:c.signal,wait:instant,capture:async()=>{c.abort();return {data:jpeg,mediaTime:1};},onProgress:e=>events.push(e)}),{name:'AbortError'});assert(!events.some(e=>e.phase==='captured'));});
test('capture failure does not offer a partial print page',async()=>{const events=[];let n=0;await assert.rejects(runPhotoSequence({wait:instant,capture:async()=>{if(++n===3)throw new Error('Camera lost');return {data:jpeg,mediaTime:n};},onProgress:e=>events.push(e)}),/Camera lost/);assert.equal(events.at(-1).completed,2);assert(!events.some(e=>e.phase==='processing'));});
test('unsupported session counts are rejected',async()=>{for(const total of [0,2,5,10])await assert.rejects(runPhotoSequence({total,capture:async()=>({data:jpeg,mediaTime:1})}));});
test('pose delay respects cancellation immediately',async()=>{const c=new AbortController(),pending=waitForPose(10000,c.signal);c.abort();await assert.rejects(pending,{name:'AbortError'});assert.throws(()=>waitForPose(1,c.signal),{name:'AbortError'});});
function camera(){const track={readyState:'live'};return {videoWidth:640,videoHeight:480,readyState:4,currentTime:1,srcObject:{getVideoTracks:()=>[track]},track};}
test('fresh-frame callback captures only the next presented frame',async()=>{const video=camera();let captured=0,cancelled=0;video.requestVideoFrameCallback=fn=>setTimeout(()=>fn(0,{mediaTime:2}),1);video.cancelVideoFrameCallback=id=>{cancelled++;clearTimeout(id);};const frame=await takeFreshPhoto(video,{previousTime:1,snapshot:()=>{captured++;return jpeg;}});assert.equal(frame.mediaTime,2);assert.equal(captured,1);});
test('stalled callback times out and does not synthesize a photo',async()=>{const video=camera();video.requestVideoFrameCallback=()=>7;let cancelled;video.cancelVideoFrameCallback=id=>{cancelled=id;};await assert.rejects(takeFreshPhoto(video,{timeoutMs:5,snapshot:()=>jpeg}),/not sending new photos/);assert.equal(cancelled,7);});
test('camera-frame request is cancellable',async()=>{const video=camera(),c=new AbortController();video.requestVideoFrameCallback=()=>7;video.cancelVideoFrameCallback=()=>{};const p=takeFreshPhoto(video,{signal:c.signal,snapshot:()=>jpeg});c.abort();await assert.rejects(p,{name:'AbortError'});});
test('ended camera cannot be captured',()=>{const video=camera();video.track.readyState='ended';assert.throws(()=>takeFreshPhoto(video,{snapshot:()=>jpeg}),/camera stopped/);});
test('older-browser fallback requires its camera clock to advance',async()=>{const video=camera();const p=takeFreshPhoto(video,{snapshot:()=>jpeg,previousTime:1,timeoutMs:100});setTimeout(()=>{video.currentTime=2;},5);assert.equal((await p).mediaTime,2);});
test('streams with repeated media time use advancing presented-frame identifiers',async()=>{let number=0;const shots=await runPhotoSequence({wait:instant,capture:async()=>({data:jpeg,mediaTime:0,presentedFrames:++number})});assert.equal(shots.length,4);assert.equal(number,4);});
test('fresh-photo callback accepts a new presented frame even with a repeated timestamp',async()=>{const video=camera();video.requestVideoFrameCallback=fn=>setTimeout(()=>fn(0,{mediaTime:0,presentedFrames:9}),1);video.cancelVideoFrameCallback=clearTimeout;const frame=await takeFreshPhoto(video,{previousTime:0,previousFrame:8,timeoutMs:20,snapshot:()=>jpeg});assert.equal(frame.presentedFrames,9);});

test('after each picture, announces next photo and waits for a fresh pose before new countdown',async()=>{
 let frame=0;const events=[],cues=[],delays=[];
 await runPhotoSequence({total:4,capture:async()=>({data:jpeg,mediaTime:++frame}),wait:async ms=>{delays.push(ms);},onProgress:p=>events.push(p),onCue:(cue,info)=>cues.push({cue,info})});
 assert.deepEqual(events.filter(e=>e.phase==='next').map(e=>[e.current,e.completed]),[[2,1],[3,2],[4,3]]);
 for(let photo=2;photo<=4;photo++){
  const first=events.findIndex(e=>e.phase==='next'&&e.current===photo);
  const second=events.findIndex((e,i)=>i>first&&e.phase==='countdown'&&e.current===photo);
  assert(first>=0&&second>first,'pose reminder before countdown '+photo);
 }
 assert.deepEqual(cues.filter(x=>x.cue==='next').map(x=>x.info.current),[2,3,4]);
 assert.equal(delays.filter(ms=>ms===3300).length,3);
});
test('one-photo session never asks for a nonexistent next photo',async()=>{
 const phases=[],cues=[];await runPhotoSequence({total:1,wait:async()=>{},capture:async()=>({data:jpeg,mediaTime:1}),onProgress:x=>phases.push(x.phase),onCue:c=>cues.push(c)});
 assert(!phases.includes('next'));assert(!cues.includes('next'));
});
