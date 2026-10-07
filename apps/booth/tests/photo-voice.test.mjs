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
