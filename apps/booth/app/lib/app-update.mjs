// Read-only update checks. Never touch event settings, counters, photo storage,
// cookies, service-worker registrations or browser caches; the user chooses when to reload.
const RELEASE=/^\d{4}\.\d{2}\.\d{2}\.\d{1,4}$/;
export function validateAppVersion(value){
  if(!value||value.app!=='friendly-photo-booth'||value.schema!==1||typeof value.version!=='string'||!RELEASE.test(value.version))throw new Error('The update response was not recognized. Keep the booth open and try again.');
  return {version:value.version,label:typeof value.label==='string'?value.label.replace(/[\u0000-\u001f]/g,' ').slice(0,120):''};
}
export function compareReleases(a,b){
  if(!RELEASE.test(a)||!RELEASE.test(b))throw new Error('Invalid app version.');
  const aa=a.split('.').map(Number),bb=b.split('.').map(Number);
  for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return aa[i]>bb[i]?1:-1;
  return 0;
}
export function updateDestination(pathname,search,version,stamp=Date.now()){
  if(typeof version!=='string'||!RELEASE.test(version)||!Number.isSafeInteger(stamp)||stamp<0)throw new Error('The update link is invalid.');
  // Only known, same-origin idle screens; never accept a redirect URL.
  const path=['/','/ipad','/launch'].includes(pathname)?pathname:'/launch';
  const source=new URLSearchParams(search),params=new URLSearchParams();
  if(path==='/'&&source.get('event')==='oct10-2026'){
    params.set('event','oct10-2026');
    if(source.get('demo')==='1')params.set('demo','1');
  }
  params.set('boothv',version);params.set('refresh',String(stamp));
  return path+'?'+params.toString();
}
export async function readAppVersion({fetcher=globalThis.fetch,signal,timeoutMs=8000}={}){
  if(signal?.aborted)throw Object.assign(new Error('Update cancelled.'),{name:'AbortError'});
  const controller=new AbortController(),abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
    const response=await fetcher('/api/app-version?check='+Date.now(),{cache:'no-store',credentials:'same-origin',redirect:'error',signal:controller.signal});
    if(!response.ok)throw new Error('Version check failed.');
    if(!(response.headers.get('content-type')||'').toLowerCase().includes('application/json'))throw new Error('Unexpected response.');
    const text=await response.text();if(text.length>2048)throw new Error('Unexpected response size.');
    return validateAppVersion(JSON.parse(text));
  }catch(error){
    if(signal?.aborted)throw Object.assign(new Error('Update cancelled.'),{name:'AbortError'});
    throw new Error('Could not check for updates. Keep the booth open, connect to Wi-Fi, and try again.');
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
