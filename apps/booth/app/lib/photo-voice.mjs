// Spoken countdown is a progressive enhancement. The visual countdown always remains authoritative.
export const VOICE_CUES=Object.freeze({
  ready:'Get ready.',
  3:'Three.',
  2:'Two.',
  1:'One.',
  smile:'Smile!'
});
export function speakCue(cue,{synth=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance}={}){
  if(!synth||typeof synth.speak!=='function'||typeof Utterance!=='function')return false;
  const text=VOICE_CUES[cue]||String(cue||'').trim();
  if(!text)return false;
  try{
    // Keep queued fallback speech intact; cancellation is reserved for ending a session.
    const utterance=new Utterance(text);
    utterance.rate=cue==='smile'?0.92:0.88;
    utterance.pitch=cue==='smile'?1.16:1.06;
    utterance.volume=1;
    const voices=typeof synth.getVoices==='function'?synth.getVoices():[];
    const preferred=voices.find(v=>/^en(-|_)/i.test(v.lang||'')&&/samantha|ava|allison|serena|female/i.test(v.name||''))||
      voices.find(v=>/^en(-|_)/i.test(v.lang||''))||voices[0];
    if(preferred)utterance.voice=preferred;
    synth.speak(utterance);
    return true;
  }catch{return false;}
}
export function stopTalking(synth=globalThis.speechSynthesis){
  stopPhotoAudio();
  try{synth?.cancel?.();}catch{}
}


const VOICE_ASSET_VERSION='female-cheerful-2026-10-07-9';
const CLIPS=['ready','3','2','1','smile','next2','next3','next4'];
let mediaRoute;
let context, buffers=new Map(), active=new Set(), generation=0;
export async function preparePhotoAudio({Context=globalThis.AudioContext||globalThis.webkitAudioContext,fetcher=globalThis.fetch}={}){
 const attempt=++generation;
 if(!Context)throw new Error('Voice audio is unavailable in this browser. Open the booth in Safari and try again.');
 context ||= new Context();
 // HTML media playback keeps the iPad media audio route open, including when
 // the hardware silent switch would otherwise mute Web Audio.
 let routeReady;
 if(typeof globalThis.Audio==='function'){
  mediaRoute ||= new Audio('/audio/media-route.wav');mediaRoute.loop=true;
  routeReady=Promise.resolve(mediaRoute.play()).catch(()=>{throw new Error('Sound could not start. Tap Test speaker, then try again.');});
 }
 // Called directly from the guest tap, before camera permission or any timers.
 const resume=context.resume();
 await Promise.all([resume,routeReady]);
 if(context.state!=='running')throw new Error('Sound is blocked. Tap the photo button again to enable voice guidance.');
 await Promise.all(CLIPS.map(async key=>{
  if(buffers.has(key))return;
  const response=await fetcher('/audio/'+key+'.wav?v='+VOICE_ASSET_VERSION,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Voice guidance could not load. Check the connection, then tap the photo button again.');
  const buffer=await context.decodeAudioData(await response.arrayBuffer());
  buffers.set(key,buffer);
 }));
 if(attempt!==generation)throw Object.assign(new Error('Audio cancelled'),{name:'AbortError'});
 // An audible confirmation verifies the same speaker route used by the countdown.
 if(!playPhotoCue('ready'))throw new Error('Sound was paused. Tap the photo button again.');
}
export function playPhotoCue(key){
 const buffer=buffers.get(key);
 if(!buffer||context?.state!=='running')return false;
 const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
 active.add(source);source.onended=()=>{active.delete(source);source.disconnect();};source.start();return Math.ceil(buffer.duration*1000);
}
export function stopPhotoAudio(){
 generation++;try{mediaRoute?.pause();}catch{}
 for(const source of active){try{source.stop();source.disconnect();}catch{}}
 active.clear();
}
