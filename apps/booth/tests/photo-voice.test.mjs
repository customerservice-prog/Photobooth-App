import test from 'node:test';
import assert from 'node:assert/strict';
import {VOICE_CUES,speakCue,stopTalking} from '../app/lib/photo-voice.mjs';

test('spoken countdown has the exact friendly cue order words',()=>{
  assert.deepEqual(VOICE_CUES,{ready:'Get ready.',3:'Three.',2:'Two.',1:'One.',smile:'Smile!'});
});

test('speaking a new cue cancels the old one and uses an English voice when available',()=>{
  const events=[];
  class U{constructor(text){this.text=text;}}
  const voices=[{name:'Test French',lang:'fr-FR'},{name:'Samantha',lang:'en-US'}];
  const synth={cancel:()=>events.push('cancel'),getVoices:()=>voices,speak:u=>events.push({text:u.text,voice:u.voice?.name,rate:u.rate,pitch:u.pitch})};
  assert.equal(speakCue('3',{synth,Utterance:U}),true);
  assert.deepEqual(events[0],'cancel');
  assert.equal(events[1].text,'Three.');
  assert.equal(events[1].voice,'Samantha');
});

test('voice is optional and never blocks the visual countdown',()=>{
  assert.equal(speakCue('smile',{synth:null,Utterance:null}),false);
  assert.doesNotThrow(()=>stopTalking(null));
});
