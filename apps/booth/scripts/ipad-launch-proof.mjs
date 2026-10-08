import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
const base=process.env.SEQUENCE_BASE_URL||'http://127.0.0.1:3000',out='sequence-proof',results=[];
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const stripSource=await readFile(new URL('../app/lib/photo-strip.mjs',import.meta.url),'utf8');
await mkdir(out,{recursive:true});
let ready=false;
for(let i=0;i<60;i++){try{const r=await fetch(base+'/ipad',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(r.ok&&(await r.text()).includes('data-launch-version="'+BOOTH_RELEASE+'"')){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,5000));}
assert(ready,'This exact iPad launcher release is deployed before tests run.');
const manifest=await (await fetch(base+'/manifest.webmanifest?proof='+Date.now(),{cache:'no-store'})).json();assert.equal(manifest.id,'/bryan-wedding');assert.equal(manifest.start_url,'/launch');
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});let page;
 const pass=(test,extra={})=>results.push({engine,test,passed:true,...extra});
 const snapshot=()=>page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).sort(([a],[b])=>a.localeCompare(b))));
 const archiveSnapshot=()=>page.evaluate(async source=>{const a=new Function(source.replace(/\bexport /g,'')+';return {listCaptures};')();const out=[];for(const scope of ['oct10-2026:demo','oct10-2026:live'])for(const r of await a.listCaptures(scope))out.push({scope,id:r.id,poses:await Promise.all(r.poses.map(async b=>Array.from(new Uint8Array(await b.arrayBuffer())))),keepsake:r.keepsake?Array.from(new Uint8Array(await r.keepsake.arrayBuffer())):null});return out;},archiveSource);
 try{
  const context=await browser.newContext({viewport:{width:1024,height:768}});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/ipad',{waitUntil:'networkidle'});
  const cfg=octoberPreset();cfg.title='Saved Customer Preview';cfg.details={...cfg.details,eventName:cfg.title,honoree:'Preserved Name',primaryColor:'#456789'};
  await page.evaluate(async ({keys,cfg,source})=>{
   localStorage.setItem(keys.config,JSON.stringify(cfg));localStorage.setItem(keys.liveUsage,'17');localStorage.setItem(keys.demoUsage,'3');localStorage.setItem('friendly-booth-event-v1',JSON.stringify({title:'Existing general event',type:'other'}));
   const a=new Function(source.replace(/\bexport /g,'')+';return {saveCapture,saveKeepsake};')();const c=document.createElement('canvas');c.width=100;c.height=80;const x=c.getContext('2d');x.fillStyle='#abcdef';x.fillRect(0,0,100,80);const jpg=c.toDataURL('image/jpeg');
   for(const scope of ['oct10-2026:demo','oct10-2026:live']){await a.saveCapture(scope,'keep-photo',jpg,Array(4).fill(jpg),cfg);const b=await (await fetch(jpg)).blob();await a.saveKeepsake(scope,'keep-photo',b);}
  },{keys:EVENT_KEYS,cfg,source:archiveSource});
  const before=await snapshot(),photos=await archiveSnapshot();
  for(const path of ['/bryan-wedding','/launch','/ipad']){await page.goto(base+path,{waitUntil:'networkidle'});assert.equal(await page.locator('[data-launch-version]').getAttribute('data-launch-version'),BOOTH_RELEASE);assert.deepEqual(await snapshot(),before);assert.deepEqual(await archiveSnapshot(),photos);pass('safe-entry-preserves-settings-counts-and-archive-'+path);}
  for(const [name,width,height] of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const g=await page.locator('.blPage').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth}));assert(g.sw<=g.w+1,name+' no horizontal overflow');
   const a=page.getByTestId('launch-demo');await a.scrollIntoViewIfNeeded();const b=await a.boundingBox();assert(b.height>=44&&b.x>=0&&b.x+b.width<=width+1);assert(await a.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
   await page.screenshot({path:out+'/ipad-launch-'+engine+'-'+name+'.png'});pass('touch-launcher-'+name,{geometry:g});
  }
  await page.setViewportSize({width:1024,height:768});await page.getByTestId('launch-demo').click();await page.getByTestId('welcome-four-photo').waitFor();await page.waitForFunction(()=>!document.querySelector('[data-testid="welcome-four-photo"]')?.disabled);
  assert(new URL(page.url()).searchParams.get('demo')==='1');assert.equal(await page.locator('.workspaceBanner').count(),1);assert((await page.locator('.workspaceBanner').innerText()).includes('OFFICE DEMO'));assert((await page.locator('#bwEventTitle').innerText()).includes('Saved Customer Preview'));assert.deepEqual(await snapshot(),before);assert.deepEqual(await archiveSnapshot(),photos);pass('launch-opens-correct-saved-demo-without-changing-allowance');
  await page.goto(base+'/ipad',{waitUntil:'networkidle'});
  // Graduation artwork must be discoverable and launchable without touching
  // existing paid events, photographs or their print counter.
  await page.getByTestId('launch-graduation').click();
  await page.getByTestId('graduation-design-preview').waitFor();
  await page.screenshot({path:out+'/graduation-showcase-'+engine+'.png',fullPage:true});
  assert.match(await page.getByTestId('graduation-one-proof').getAttribute('data-testid'),/graduation-one-proof/);
  assert.equal(await page.getByTestId('graduation-four-proof').locator('[data-guest-photo]').count(),0,'sample placeholders cannot impersonate captured guests');
  await page.getByRole('button',{name:/Use this design — open the Photo Booth/}).click();
  await page.getByTestId('welcome-four-photo').waitFor({timeout:25000});
  assert.equal(new URL(page.url()).searchParams.get('booth_event'),'graduation-showcase');
  assert((await page.locator('.workspaceBanner').innerText()).includes('SHOWCASE DEMO'));
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'3');
  assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).title,EVENT_KEYS.config),'Saved Customer Preview');
  pass('graduation-preview-one-click-isolated-from-paid-event');
  await page.goto(base+'/ipad',{waitUntil:'networkidle'});
  const cornerProof=await page.evaluate(async source=>{
   const a=new Function(source.replace(/\bexport /g,'')+';return {composePhotoStrip,fitPose,photoStripCells};')();const dimensions=[[800,200],[200,800],[640,480],[480,640]],colors=['rgb(240,30,30)','rgb(30,220,40)','rgb(30,50,240)','rgb(240,220,30)'];
   const shots=dimensions.map(([w,h],i)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#555555';x.fillRect(0,0,w,h);[[0,0],[w*.85,0],[0,h*.85],[w*.85,h*.85]].forEach(([left,top],j)=>{x.fillStyle=colors[j];x.fillRect(left,top,w*.15,h*.15);});x.fillStyle='#ffffff';x.font=Math.floor(Math.min(w,h)/3)+'px sans-serif';x.fillText('POSE '+(i+1),w*.24,h*.6);return c.toDataURL('image/jpeg',.97);});
   const data=await a.composePhotoStrip(shots,{printPackage:{shotsPerSession:4}}),img=new Image();await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=data;});const c=document.createElement('canvas');c.width=1200;c.height=1200;const x=c.getContext('2d');x.drawImage(img,0,0);const pixels=[];
   a.photoStripCells(4).forEach((cell,i)=>{const [w,h]=dimensions[i],r=a.fitPose(w,h,cell);for(const [j,[fx,fy]] of [[.07,.07],[.93,.07],[.07,.93],[.93,.93]].entries())pixels.push({pose:i+1,corner:j,rgba:Array.from(x.getImageData(Math.floor(r.x+r.w*fx),Math.floor(r.y+r.h*fy),1,1).data)});});
   img.style.cssText='width:100%;max-width:600px;height:auto;display:block;margin:auto';img.alt='All four original camera poses with four preserved corner markers';img.setAttribute('data-testid','pose-corners');document.querySelector('.blCard').replaceChildren(img);return {pixels};
  },stripSource);
  const expected=[[240,30,30],[30,220,40],[30,50,240],[240,220,30]];for(const p of cornerProof.pixels)for(let i=0;i<3;i++)assert(Math.abs(p.rgba[i]-expected[p.corner][i])<30,engine+' pose '+p.pose+' retains corner '+p.corner);
  await page.getByTestId('pose-corners').screenshot({path:out+'/all-pose-corners-'+engine+'.png'});pass('all-sixteen-corners-survive-four-pose-composition',cornerProof);assert.deepEqual(errors,[]);
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:768,height:1024}});const p=await noJS.newPage();await p.goto(base+'/bryan-wedding');await p.getByTestId('launch-demo').waitFor();assert.equal(await p.locator('[data-launch-version]').getAttribute('data-launch-version'),BOOTH_RELEASE);assert((await p.getByTestId('launch-demo').getAttribute('href')).includes('demo=1'));pass('old-home-screen-has-usable-native-links-without-javascript');await noJS.close();
 }catch(error){if(page)await page.screenshot({path:out+'/ipad-launch-'+engine+'-failure.png'}).catch(()=>{});results.push({engine,passed:false,message:error.message,stack:error.stack});throw error;}finally{await browser.close();await writeFile(out+'/ipad-launch-results.json',JSON.stringify({base,release:BOOTH_RELEASE,results},null,2));}
}
console.log(JSON.stringify({ipadAndPoseChecks:results.length,failed:0,base}));
