// Guest display only. A browser wake lock is not an iPad kiosk lock:
// Guided Access must be activated on the physical device by staff.
export const SCREEN_AWAKE_KEY='friendly-booth-screen-awake-v1';

export function readScreenAwakeSetting(storage){
 try{return storage?.getItem(SCREEN_AWAKE_KEY)!=='off';}
 catch{return true;} // Default to keeping the booth visible; never modify event data.
}
export function saveScreenAwakeSetting(storage,enabled){
 try{storage.setItem(SCREEN_AWAKE_KEY,enabled?'on':'off');return true;}
 catch{return false;}
}

export function createScreenAwakeController({doc,win,nav,onStatus=()=>{}}){
 let enabled=false,started=false,lock=null,pending=false,generation=0,status='off';
 const visible=()=>doc?.visibilityState!=='hidden';
 function report(next){if(status!==next){status=next;onStatus(next);}}
 function releaseHeld(){
  const previous=lock;lock=null;
  if(previous)try{void Promise.resolve(previous.release()).catch(()=>{});}catch{}
 }
 async function request(){
  if(!started||!enabled||!visible())return;
  if(lock&&!lock.released){report('active');return;}
  if(pending)return;
  if(typeof nav?.wakeLock?.request!=='function'){report('unsupported');return;}
  pending=true;const requestedGeneration=generation;report('requesting');
  try{
   const granted=await nav.wakeLock.request('screen');
   pending=false;
   if(!started||!enabled||!visible()||requestedGeneration!==generation){
    try{await granted.release();}catch{}
    // A setting or visibility change during an in-flight request cannot
    // revive a disabled lock. Re-attempt only if the user still wants it.
    if(started&&enabled&&visible())void request();
    return;
   }
   lock=granted;
   granted.addEventListener?.('release',()=>{
    if(lock===granted){
     lock=null;
     if(started&&enabled)report(visible()?'interrupted':'waiting');
    }
   });
   report('active');
  }catch{
   pending=false;
   if(!started||!enabled)return;
   if(requestedGeneration!==generation&&visible()){void request();return;}
   report(visible()?'blocked':'waiting');
  }
 }
 function onVisibility(){
  if(!visible()){
   generation++;releaseHeld();
   if(started&&enabled)report('waiting');
  }else void request();
 }
 function onInteraction(){if(enabled&&status!=='active')void request();}
 function start(initialEnabled=true){
  if(started)return;
  enabled=Boolean(initialEnabled);started=true;
  doc?.addEventListener?.('visibilitychange',onVisibility);
  doc?.addEventListener?.('pointerdown',onInteraction,{passive:true});
  doc?.addEventListener?.('keydown',onInteraction);
  win?.addEventListener?.('focus',onInteraction);
  if(enabled)void request();else report('off');
 }
 function setEnabled(next){
  enabled=Boolean(next);generation++;
  if(!enabled){releaseHeld();report('off');}
  else if(started)void request();
 }
 function stop(){
  started=false;enabled=false;generation++;
  doc?.removeEventListener?.('visibilitychange',onVisibility);
  doc?.removeEventListener?.('pointerdown',onInteraction);
  doc?.removeEventListener?.('keydown',onInteraction);
  win?.removeEventListener?.('focus',onInteraction);
  releaseHeld();
  // No React callbacks on teardown.
 }
 return {start,setEnabled,retry:request,stop,getStatus:()=>status,getEnabled:()=>enabled};
}
