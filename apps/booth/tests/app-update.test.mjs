import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateAppVersion,compareReleases,updateDestination,readAppVersion,refreshInstalledWorkerOnManualUpdate} from '../app/lib/app-update.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
const version={app:'friendly-photo-booth',schema:1,version:BOOTH_RELEASE,label:'Smile countdown'};
const response=body=>new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});

test('only recognized public release metadata is accepted',()=>{
 assert.deepEqual(validateAppVersion({...version,redirect:'https://bad.example',secret:'not-returned'}),{version:BOOTH_RELEASE,label:'Smile countdown'});
 for(const value of [null,{}, {...version,app:'other'}, {...version,schema:2}, {...version,version:'javascript:alert(1)'},{...version,version:23}])assert.throws(()=>validateAppVersion(value));
});
test('release comparison is numeric rather than lexical',()=>{
 assert.equal(compareReleases('2026.10.07.10','2026.10.07.3'),1);
 assert.equal(compareReleases('2026.10.07.2',BOOTH_RELEASE),-1);
 assert.equal(compareReleases(BOOTH_RELEASE,BOOTH_RELEASE),0);
 assert.throws(()=>compareReleases('unknown',BOOTH_RELEASE));
});
test('update retains the same October demo with no arbitrary redirect or stale cache token',()=>{
 const dest=updateDestination('/','?event=oct10-2026&demo=1&redirect=https://evil.example&boothv=old&refresh=0',BOOTH_RELEASE,123);
 const u=new URL(dest,'https://booth.example');assert.equal(u.pathname,'/');assert.equal(u.searchParams.get('event'),'oct10-2026');assert.equal(u.searchParams.get('demo'),'1');assert.equal(u.searchParams.get('boothv'),BOOTH_RELEASE);assert.equal(u.searchParams.get('refresh'),'123');assert.equal(u.searchParams.size,4);
});
test('actual-event update never changes to demo',()=>{
 const u=new URL(updateDestination('/','?event=oct10-2026',BOOTH_RELEASE,123),'https://booth.example');assert.equal(u.searchParams.get('event'),'oct10-2026');assert.equal(u.searchParams.has('demo'),false);
});
test('general saved booth remains general and launcher routes remain safe',()=>{
 assert(updateDestination('/','?event=unrelated&demo=1',BOOTH_RELEASE,1).startsWith('/?boothv='));
 assert(updateDestination('/ipad','',BOOTH_RELEASE,1).startsWith('/ipad?'));
 for(const path of ['/bryan-wedding','//evil.example','https://evil.example','/event-prep'])assert(updateDestination(path,'?next=evil',BOOTH_RELEASE,1).startsWith('/launch?'));
});
test('invalid update links and timestamps are rejected',()=>{
 for(const stamp of [-1,NaN,Infinity,1.5,'123'])assert.throws(()=>updateDestination('/','',BOOTH_RELEASE,stamp));
 assert.throws(()=>updateDestination('/','','bad version',1));
});
test('version check explicitly bypasses HTTP cache and never follows redirects',async()=>{
 let options,url;assert.equal((await readAppVersion({fetcher:async(u,o)=>{url=u;options=o;return response(version);}})).version,BOOTH_RELEASE);
 assert(url.startsWith('/api/app-version?check='));assert.equal(options.cache,'no-store');assert.equal(options.credentials,'same-origin');assert.equal(options.redirect,'error');assert(options.signal instanceof AbortSignal);
});
test('wrong content, large metadata and HTTP failures do not imply successful update',async()=>{
 for(const res of [new Response('failure',{status:503}),new Response('<html>login</html>',{headers:{'content-type':'text/html'}}),response({...version,label:'x'.repeat(3000)}),response({app:'other'})])await assert.rejects(()=>readAppVersion({fetcher:async()=>res}),/Could not check for updates/);
});
test('network errors become safe, actionable errors without leaking internals',async()=>{
 await assert.rejects(()=>readAppVersion({fetcher:async()=>{throw new Error('secret token example');}}),e=>e.message.includes('Wi-Fi')&&!e.message.includes('secret'));
});
test('cancelled update does not send a request',async()=>{
 const c=new AbortController();c.abort();let sent=false;await assert.rejects(()=>readAppVersion({signal:c.signal,fetcher:async()=>{sent=true;return response(version);}}),e=>e.name==='AbortError');assert.equal(sent,false);
});
test('a stalled version request is aborted with a timeout',async()=>{
 let aborted=false;await assert.rejects(()=>readAppVersion({timeoutMs:15,fetcher:async(_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new Error('aborted'));},{once:true}))}),/Keep the booth open/);assert(aborted);
});
test('an in-flight caller cancellation propagates and releases its listeners',async()=>{
 const c=new AbortController();const promise=readAppVersion({signal:c.signal,fetcher:async(_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}))});c.abort();await assert.rejects(()=>promise,e=>e.name==='AbortError');
});
test('updater never resets browser storage or registers a service worker',async()=>{
 const [helper,component]=await Promise.all(['../app/lib/app-update.mjs','../app/components/AppUpdate.js'].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
 for(const src of [helper,component])assert.doesNotMatch(src,/localStorage|indexedDB|sessionStorage|caches\.|serviceWorker\.|document\.cookie|Clear-Site-Data/);
 assert.match(component,/if\(reload\)/);assert.match(component,/controller\.signal\.aborted/);
});
test('update is offered only at safe welcome and launcher screens',async()=>{
 const read=p=>readFile(new URL(p,import.meta.url),'utf8');assert.match(await read('../app/components/WelcomeScreen.js'),/<AppUpdate disabled=\{starting\}/);assert.match(await read('../app/components/BoothLauncher.js'),/<AppUpdate\/>/);
 for(const path of ['../app/components/PhotoCapture.js','../app/components/PhotoPreview.js','../app/event-prep/page.js'])assert.doesNotMatch(await read(path),/<AppUpdate/);
});
test('public metadata has no secrets, no cookies and explicit no-store headers',async()=>{
 const src=await readFile(new URL('../app/api/app-version/route.js',import.meta.url),'utf8');assert.match(src,/force-dynamic/);assert.match(src,/no-store, max-age=0/);assert.doesNotMatch(src,/process\.env|Set-Cookie|DATABASE_URL/);
});

test('updating an imported event returns to that event without loading unrelated storage',()=>{
 const id='11111111-aaaa-4444-bbbb-888888888888';
 const u=new URL(updateDestination('/','?booth_event='+id+'&event=oct10-2026&demo=1&redirect=https://bad.example',BOOTH_RELEASE,123),'https://booth.example');
 assert.equal(u.searchParams.get('booth_event'),id);
 assert.equal(u.searchParams.has('event'),false);
 assert.equal(u.searchParams.has('demo'),false);
 assert.equal(u.searchParams.get('boothv'),BOOTH_RELEASE);
 assert.equal(u.searchParams.get('refresh'),'123');
 assert.equal(u.searchParams.size,3);
});

test('manual iPad app update explicitly activates the waiting service worker',async()=>{
 const listeners=new Map(),sent=[];
 const serviceWorker={
  addEventListener:(name,listener)=>listeners.set(name,listener),
  removeEventListener:name=>listeners.delete(name),
  getRegistration:async()=>({update:async()=>{},waiting:{postMessage(message){sent.push(message);listeners.get('controllerchange')?.();}}})
 };
 assert.equal(await refreshInstalledWorkerOnManualUpdate({serviceWorker,timeoutMs:150}),'requested');
 assert.deepEqual(sent,[{type:'ACTIVATE_UPDATED_BOOTH'}]);
 assert.equal(listeners.size,0);
});
test('manual app update safely skips browsers without service workers',async()=>{
 assert.equal(await refreshInstalledWorkerOnManualUpdate({serviceWorker:null}),'not-installed');
});
