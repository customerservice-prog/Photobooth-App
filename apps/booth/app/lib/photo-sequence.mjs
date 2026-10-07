// Still photographs only: one countdown and one fresh camera frame per pose.
const cancelled=()=>Object.assign(new Error('Photo session cancelled.'),{name:'AbortError'});
const check=signal=>{if(signal?.aborted)throw cancelled();};
export function waitForPose(ms,signal){
 check(signal);
 return new Promise((resolve,reject)=>{
  const stop=()=>{clearTimeout(timer);signal?.removeEventListener('abort',stop);reject(cancelled());};
  const timer=setTimeout(()=>{signal?.removeEventListener('abort',stop);resolve();},ms);
  signal?.addEventListener('abort',stop,{once:true});
 });
}
function cameraReady(video){
 const tracks=video?.srcObject?.getVideoTracks?.()||[];
 if(!video?.videoWidth||video.readyState<2||!tracks.length||tracks.some(t=>t.readyState!=='live'))throw new Error('The camera stopped. Please start a new photo session.');
}
export function cameraJpeg(video){
 cameraReady(video);
 const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
 try{const ctx=canvas.getContext('2d');if(!ctx)throw new Error('This camera photo could not be prepared.');ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0);return canvas.toDataURL('image/jpeg',.92);}finally{canvas.width=0;canvas.height=0;}
}
export function takeFreshPhoto(video,{signal,previousTime=-1,timeoutMs=4000,snapshot=cameraJpeg}={}){
 check(signal);cameraReady(video);
 // Capture inside the callback for a NEW presented video frame, not a cached still.
 // Older browsers fall back to an advancing video media clock.
 return new Promise((resolve,reject)=>{
  const startTime=Number(video.currentTime)||0;
  let frameId=null,rafId=null,settled=false;
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);if(frameId!==null)video.cancelVideoFrameCallback?.(frameId);if(rafId!==null)(globalThis.cancelAnimationFrame||clearTimeout)(rafId);};
  const finish=(error,result)=>{if(settled)return;settled=true;cleanup();error?reject(error):resolve(result);};
  const abort=()=>finish(cancelled());
  const timer=setTimeout(()=>finish(new Error('The camera is not sending new photos. Check the camera, then try again.')),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  const capture=time=>{try{check(signal);cameraReady(video);finish(null,{data:snapshot(video),mediaTime:time});}catch(error){finish(error);}};
  if(typeof video.requestVideoFrameCallback==='function'){
   const next=()=>{frameId=video.requestVideoFrameCallback((_now,metadata)=>{
    frameId=null;if(settled)return;
    const time=Number(metadata.mediaTime);
    if(Number.isFinite(time)&&time>previousTime)capture(time);else next();
   });};
   try{next();}catch(error){finish(error);}
  }else{
   const raf=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));
   const next=()=>{rafId=raf(()=>{rafId=null;if(settled)return;try{cameraReady(video);}catch(error){finish(error);return;}const time=Number(video.currentTime);if(time>startTime&&time>previousTime)capture(time);else next();});};next();
  }
 });
}
export async function runPhotoSequence({total=4,signal,capture,onProgress=()=>{},wait=waitForPose}){
 if(![3,4].includes(total)||typeof capture!=='function')throw new Error('Choose a three- or four-photo session.');
 const shots=[];let previousTime=-1;
 const emit=(phase,current,count=null)=>{check(signal);onProgress({phase,current,total,count,completed:shots.length,shots:[...shots]});};
 for(let index=0;index<total;index++){
  check(signal);const current=index+1;
  emit('pose',current);await wait(650,signal);
  for(let count=3;count>=1;count--){emit('countdown',current,count);await wait(1000,signal);}
  emit('smile',current);await wait(250,signal);check(signal);
  const frame=await capture({index,previousTime,signal});check(signal);
  if(!frame||!/^data:image\/jpeg;base64,/.test(frame.data)||!Number.isFinite(frame.mediaTime)||frame.mediaTime<=previousTime)throw new Error('A new camera photo was not received. Please try the session again.');
  previousTime=frame.mediaTime;shots.push(frame.data);
  emit('captured',current);await wait(250,signal);
 }
 emit('processing',total);
 return shots;
}
