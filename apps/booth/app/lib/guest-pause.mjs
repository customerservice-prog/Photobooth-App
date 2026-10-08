// Event photo pauses are device-local UI state; no recordings, archives or print counts change.
export const GUEST_PAUSE_OPTIONS=Object.freeze([6,9,12]);
export const DEFAULT_GUEST_PAUSE_SECONDS=6;
export function normalizeGuestPause(value){
 const n=Number(value);
 return GUEST_PAUSE_OPTIONS.includes(n)?n:DEFAULT_GUEST_PAUSE_SECONDS;
}
export function normalizePhotoPreference(value){return value==='one'?'one':'four';}
const aborted=()=>Object.assign(new Error('Photo session cancelled.'),{name:'AbortError'});
// The pause is visible and timed, but guests can start the next countdown early.
// Cleanup removes the ready callback and timer whenever a session is cancelled.
export function waitForGuestReady({seconds=DEFAULT_GUEST_PAUSE_SECONDS,signal,onTick=()=>{},registerReady=()=>{},schedule=fn=>setTimeout(fn,1000),cancel=id=>clearTimeout(id)}={}){
 if(signal?.aborted)return Promise.reject(aborted());
 const amount=normalizeGuestPause(seconds);
 return new Promise((resolve,reject)=>{
  let remaining=amount,timer=null,complete=false;
  const cleanup=()=>{
   if(timer!==null)cancel(timer);
   signal?.removeEventListener('abort',abort);
   registerReady(null);
  };
  const finish=error=>{
   if(complete)return;
   complete=true;cleanup();
   if(error)reject(error);else resolve();
  };
  const abort=()=>finish(aborted());
  signal?.addEventListener('abort',abort,{once:true});
  registerReady(()=>finish());
  function tick(){
   if(complete)return;
   if(signal?.aborted){finish(aborted());return;}
   try{onTick(remaining);}catch(error){finish(error);return;}
   if(remaining===0){finish();return;}
   remaining--;timer=schedule(tick);
  }
  tick();
 });
}
