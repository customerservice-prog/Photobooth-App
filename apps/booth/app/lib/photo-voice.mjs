// Keep one audio player across a whole session. A guest tap unlocks playback on
// iPad Safari before getUserMedia and its permission prompt resolve.
export const VOICE_CUES=Object.freeze({ready:'Get ready.',3:'Three.',2:'Two.',1:'One.',smile:'Smile!'});
export const VOICE_CLIPS=Object.freeze({
 start:'/voice/start.mp3?boothv=2026.10.07.7',
 countdown:'/voice/countdown.mp3?boothv=2026.10.07.7',
 next:'/voice/next.mp3?boothv=2026.10.07.7'
});
let player=null,playToken=0;
export function playRecordedVoice(kind,{AudioCtor=globalThis.Audio,onState=()=>{}}={}){
 if(!Object.hasOwn(VOICE_CLIPS,kind))return false;
 if(typeof AudioCtor!=='function'){onState('unavailable');return false;}
 try{
  if(!player)player=new AudioCtor();
  const token=++playToken;
  player.pause?.();player.preload='auto';player.volume=1;player.muted=false;
  player.src=VOICE_CLIPS[kind];
  try{player.currentTime=0;}catch{}
  // This play() runs synchronously in the guest's real click handler.
  const pending=player.play();onState('starting');
  if(pending&&typeof pending.then==='function'){
   Promise.resolve(pending).then(()=>{if(token===playToken)onState('playing');}).catch(()=>{if(token===playToken)onState('blocked');});
  }else onState('playing');
  return true;
 }catch{onState('blocked');return false;}
}
// Retain a backwards-compatible optional engine for tests/older integrations,
// but do NOT call it for timed production countdowns: iPad may speak nothing.
export function speakCue(cue,{synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){
 if(!synth||typeof synth.speak!=='function'||typeof Utterance!=='function')return false;
 const text=VOICE_CUES[cue]||String(cue||'').trim();if(!text)return false;
 try{
  synth.cancel();
  const u=new Utterance(text);u.rate=cue==='smile'?.92:.88;u.pitch=cue==='smile'?1.16:1.06;u.volume=1;
  const voices=typeof synth.getVoices==='function'?synth.getVoices():[];
  u.voice=voices.find(v=>/^en[-_]/i.test(v.lang||'')&&/samantha|ava|allison|serena|female/i.test(v.name||''))||
    voices.find(v=>/^en[-_]/i.test(v.lang||''))||voices[0]||null;
  synth.speak(u);return true;
 }catch{return false;}
}
export function stopTalking(synth=globalThis.speechSynthesis){
 ++playToken;try{player?.pause?.();}catch{}try{synth?.cancel?.();}catch{}
}
