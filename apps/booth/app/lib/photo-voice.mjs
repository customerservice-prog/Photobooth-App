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
    synth.cancel();
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
  try{synth?.cancel?.();}catch{}
}
