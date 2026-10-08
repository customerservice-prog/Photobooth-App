/* Friendly Booth: only public app-shell assets are cached. Never cache API data,
   handoff URLs, recipients or personal JPEGs. Photos remain in IndexedDB. */
const CACHE='friendly-booth-shell-20261008-1',SHELL=['/','/launch','/help','/icon.svg','/manifest.webmanifest'];
const safeAsset=url=>url.origin===self.location.origin&&
 (/^\/_next\/static\//.test(url.pathname)||/^\/(audio\/|icon\.svg$|print-test\.svg$|manifest\.webmanifest$)/.test(url.pathname));
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  await Promise.allSettled(SHELL.map(path=>cache.add(path)));
 }));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(k=>k.startsWith('friendly-booth-shell-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_APP_RESOURCES'||!Array.isArray(event.data.urls))return;
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const requested=event.data.urls.slice(0,150);
  await Promise.allSettled(requested.map(async raw=>{
   const url=new URL(raw,self.location.origin);
   if(!safeAsset(url))return;
   await cache.add(new Request(url.href,{credentials:'same-origin'}));
  }));
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname==='/handoff'||url.pathname.startsWith('/keepsake'))return;
 if(safeAsset(url)){
  event.respondWith((async()=>{
   const cached=await caches.match(req);
   if(cached)return cached;
   const response=await fetch(req);
   if(response.ok&&response.type==='basic'){
    const cache=await caches.open(CACHE);
    await cache.put(req,response.clone());
   }
   return response;
  })());
  return;
 }
 if(req.mode==='navigate'&&['/','/launch','/help'].includes(url.pathname)){
  event.respondWith((async()=>{
   try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),4500);
    let response;
    try{response=await fetch(req,{signal:controller.signal});}finally{clearTimeout(timer);}
    if(response.ok){
     const cache=await caches.open(CACHE);
     // Save just the public shell; URLs with event IDs never become cache keys.
     if(!url.search)await cache.put(url.pathname,response.clone());
    }
    return response;
   }catch{
    return (await caches.match(url.pathname))||(await caches.match('/'))||
     new Response('The booth must be opened online once before offline use.',{status:503,headers:{'Content-Type':'text/plain'}});
   }
  })());
 }
});
