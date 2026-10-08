import test from 'node:test';
import assert from 'node:assert/strict';
import {VOICE_CUES,speakCue,stopTalking,preparePhotoAudio,playPhotoCue,stopPhotoAudio} from '../app/lib/photo-voice.mjs';

test('spoken countdown has the exact friendly cue order words',()=>{
  assert.deepEqual(VOICE_CUES,{ready:'Get ready.',3:'Three.',2:'Two.',1:'One.',smile:'Smile!'});
});

test('speaking a fallback cue preserves queued speech and uses an English voice when available',()=>{
  const events=[];
  class U{constructor(text){this.text=text;}}
  const voices=[{name:'Test French',lang:'fr-FR'},{name:'Samantha',lang:'en-US'}];
  const synth={cancel:()=>events.push('cancel'),getVoices:()=>voices,speak:u=>events.push({text:u.text,voice:u.voice?.name,rate:u.rate,pitch:u.pitch})};
  assert.equal(speakCue('3',{synth,Utterance:U}),true);
  assert.equal(events[0].text,'Three.');
  assert.equal(events[0].voice,'Samantha');
});

test('voice is optional and never blocks the visual countdown',()=>{
  assert.equal(speakCue('smile',{synth:null,Utterance:null}),false);
  assert.doesNotThrow(()=>stopTalking(null));
});

test('recorded audio resumes from the tap, decodes all cues and stops active sources',async()=>{
 const events=[];class Context{
  state='suspended';destination={};
  resume(){events.push('resume');this.state='running';return Promise.resolve();}
  decodeAudioData(){events.push('decode');return Promise.resolve({duration:1.1});}
  createBufferSource(){return {connect(){},disconnect(){},start(){events.push('start');},stop(){events.push('stop');}};}
 }
 await preparePhotoAudio({Context,fetcher:async url=>{events.push(url);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};}});
 assert.equal(events[0],'resume');assert.equal(events.filter(e=>e==='decode').length,8);
 assert.equal(playPhotoCue('next2'),1100);stopPhotoAudio();assert.equal(events.filter(e=>e==='stop').length,2);
 assert.equal(playPhotoCue('missing'),false);
});

test('opening a guest session primes audio without speaking the same ready greeting twice',async()=>{
 const guestVoice=await import('../app/lib/photo-voice.mjs?guest-no-double-ready');
 const before=[];class Context{
  state='suspended';destination={};
  resume(){this.state='running';return Promise.resolve();}
  decodeAudioData(){return Promise.resolve({duration:1});}
  createBufferSource(){return {connect(){},disconnect(){},start(){before.push('start');},stop(){}};}
 }
 await guestVoice.preparePhotoAudio({Context,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}),playConfirmation:false});
 assert.equal(before.length,0,'opening the camera does not speak a duplicate cue');
 assert.equal(guestVoice.playPhotoCue('ready'),1000,'the guided countdown can speak ready once');
 assert.equal(before.length,1);
 guestVoice.stopPhotoAudio();
});

test('HTML media route rejection does not block the recorded voice countdown',async()=>{
 const boothVoice=await import('../app/lib/photo-voice.mjs?blocked-media-route');
 const previousAudio=globalThis.Audio,events=[];
 globalThis.Audio=class{
  loop=false;
  play(){events.push('media-blocked');return Promise.reject(new Error('NotAllowedError: audio denied'));}
  pause(){}
 };
 class Context{
  state='suspended';destination={};
  resume(){this.state='running';events.push('web-audio-resumed');return Promise.resolve();}
  decodeAudioData(){return Promise.resolve({duration:0.85});}
  createBufferSource(){return {connect(){},disconnect(){},start(){events.push('recorded-voice-played');},stop(){}};}
 }
 try{
  await boothVoice.preparePhotoAudio({Context,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)}),playConfirmation:false});
  assert(events.includes('media-blocked'));
  assert(events.includes('web-audio-resumed'));
  assert.equal(boothVoice.playPhotoCue('ready'),850);
  assert(events.includes('recorded-voice-played'));
 }finally{
  boothVoice.stopPhotoAudio();
  if(previousAudio===undefined)delete globalThis.Audio;
  else globalThis.Audio=previousAudio;
 }
});
test('missing audio context reports optional sound failure for the camera to bypass',async()=>{
 const boothVoice=await import('../app/lib/photo-voice.mjs?missing-audio-context');
 await assert.rejects(()=>boothVoice.preparePhotoAudio({Context:null}),/Voice audio is unavailable/);
});
