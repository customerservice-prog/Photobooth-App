import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {octoberPreset,EVENT_KEYS,PREP_CHECKS} from '../app/lib/event-workspace.mjs';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {stripPhotoCells} from '../app/lib/classic-photo-strip.mjs';
const base=process.env.STRIP_BASE_URL||'http://127.0.0.1:3000',out='strip-proof',results=[];
await mkdir(out,{recursive:true});
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
for(let i=0;i<60;i++){try{if((await fetch(base+'/api/app-version')).ok)break;}catch{}if(i===59)throw new Error('Booth server unavailable');await new Promise(r=>setTimeout(r,1000));}
const engines=process.env.STRIP_CHROMIUM_ONLY?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
for(const [engine,api] of engines){
 const browser=await api.launch({headless:true,...(engine==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{} )});
 let context,page;
 const pass=(name,extra={})=>results.push({engine,name,passed:true,...extra});
 async function open({demo=true,total=4,settings}={}){
  if(context)await context.close();context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',acceptDownloads:true});
  const cfg=octoberPreset();cfg.printPackage.shotsPerSession=total;cfg.printLayouts=settings;cfg.preparation={colorsConfirmed:true,checks:Object.fromEntries(Object.keys(PREP_CHECKS).map(k=>[k,true]))};
  await context.addInitScript(({cfg,keys})=>{
   // Seed only this isolated test context. No real event or customer device is modified.
   if(!localStorage.getItem(keys.config)){localStorage.setItem(keys.config,JSON.stringify(cfg));localStorage.setItem(keys.liveUsage,'17');localStorage.setItem(keys.demoUsage,'4');}
   window.__draws=[];window.__prints=0;window.__cameras=0;
   window.print=()=>{window.__prints++;setTimeout(()=>window.dispatchEvent(new Event('afterprint')),30);};
   const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(source,...args){if(source instanceof HTMLVideoElement)window.__draws.push(performance.now());return original.call(this,source,...args);};
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{
    window.__cameras++;const c=document.createElement('canvas');c.width=640;c.height=480;const ctx=c.getContext('2d');let n=0;
    const draw=()=>{n++;ctx.fillStyle=['#375b53','#565d83','#86634f'][Math.floor(n/8)%3];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff9df';ctx.font='bold 72px sans-serif';ctx.fillText('POSE '+n,95,255);for(const [x,y,color] of [[0,0,'#ff0000'],[592,0,'#00ff00'],[0,432,'#0000ff'],[592,432,'#ffff00']]){ctx.fillStyle=color;ctx.fillRect(x,y,48,48);}};draw();const stream=c.captureStream(20),timer=setInterval(draw,70);const track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};return stream;
   }}});
  },{cfg,keys:EVENT_KEYS});
  page=await context.newPage();page.setDefaultTimeout(15000);page.__errors=[];page.on('pageerror',e=>page.__errors.push(e.message));
  await page.goto(base+'/?event=oct10-2026'+(demo?'&demo=1':''),{waitUntil:'networkidle'});await page.getByTestId('welcome-four-photo').waitFor();
 }
 async function ready(){await page.waitForFunction(()=>{const b=document.querySelector('.ksMainActions .ksSecondary');return b&&!b.disabled;},null,{timeout:30000});}
 async function capture(){await page.getByTestId('welcome-four-photo').click();await page.locator('.pcStage').waitFor();assert.equal(await page.locator('.ksStudio').count(),0);await page.locator('.ksStudio').waitFor({timeout:100000});await ready();}
 async function records(){return page.evaluate(async source=>{const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')();const rows=await api.listCaptures('oct10-2026:demo');return Promise.all(rows.map(async r=>({id:r.id,poses:await Promise.all(r.poses.map(async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer())))).map(p=>p.then(a=>a.join(',')))),keepsake:r.keepsake?.size})));},archiveSource);}
 try{
  const version=await (await fetch(base+'/api/app-version')).json();assert.equal(version.version,BOOTH_RELEASE);
  await open();await capture();assert.equal(await page.evaluate(()=>window.__draws.length),4);assert.equal(await page.locator('.ksStudio').getAttribute('data-output-layout'),'card');pass('all-four-photos-finish-before-format-selection');
  await page.getByTestId('layout-strip').click();await ready();assert.equal(await page.locator('.ksStudio').getAttribute('data-output-layout'),'photo_strip');
  assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-strip-mode'),'single');
  assert.equal(await page.getByTestId('strip-arrangement-single').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg image[data-pose]').count(),4);
  assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg image[preserveAspectRatio="xMidYMid slice"]').count(),4);
  pass('photo-strip-choice-defaults-to-one-centered-strip-with-filled-slots');
  await page.getByTestId('strip-arrangement-double').click();await ready();
  assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-strip-mode'),'double');
  const images=await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg image[data-pose]').evaluateAll(es=>es.map(e=>({pose:e.dataset.pose,src:e.getAttribute('href'),fit:e.getAttribute('preserveAspectRatio')})));
  assert.deepEqual(images.map(i=>i.pose),['1','2','3','4','1','2','3','4']);
  assert.equal(new Set(images.map(i=>i.src)).size,4);
  assert.deepEqual(images.slice(0,4).map(i=>i.src),images.slice(4).map(i=>i.src));
  assert(images.every(i=>i.fit==='xMidYMid slice'));
  pass('optional-double-strips-keep-four-unique-photos-in-order');
  for(const [name,width,height] of [['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);const geometry=await page.locator('.ksStudio').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight}));assert(geometry.sw<=geometry.w+1&&geometry.sh<=geometry.h+1,name+' fits');
   await page.getByTestId('layout-strip').scrollIntoViewIfNeeded();for(const locator of [page.getByTestId('layout-strip'),page.getByRole('button',{name:'Print test sheet',exact:true})]){const b=await locator.boundingBox();assert(b.height>=44&&b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=height+1,name+' control readable');}
   await page.screenshot({path:`${out}/${engine}-${name}-strips.png`});pass('responsive-strip-chooser-'+name,{geometry});
  }
  await page.setViewportSize({width:1024,height:768});await page.getByRole('button',{name:'Digital Strip',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download Keepsake',exact:true}).click();const file=await download;await file.saveAs(`${out}/${engine}-double-strip.jpg`);const bytes=await readFile(`${out}/${engine}-double-strip.jpg`);const meta=await sharp(bytes).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,1800);assert.match(file.suggestedFilename(),/-photo-strip.jpg$/);
  const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let covered=0;
  for(const offset of [0,600])for(const cell of stripPhotoCells(4)){
   const positions=[[cell.x+15,cell.y+cell.h/2],[cell.x+cell.w-15,cell.y+cell.h/2],[cell.x+cell.w/2,cell.y+20],[cell.x+cell.w/2,cell.y+cell.h-20]];
   for(const [xx,yy] of positions){
    const x=Math.round(offset+xx),y=Math.round(yy),p=(y*info.width+x)*info.channels;
    const rgb=[data[p],data[p+1],data[p+2]];
    assert(rgb.every(Number.isFinite),'photo pixel data must exist');
    const mean=rgb.reduce((a,b)=>a+b,0)/3,range=Math.max(...rgb)-Math.min(...rgb);
    assert(mean<195||range>35,'a captured photo must fill the slot without blank letterbox bars');
    covered++;
   }
  }
  pass('digital-double-strip-jpeg-fills-all-32-photo-slot-edges',{covered});await page.getByRole('button',{name:'Close dialog',exact:true}).click();
  await page.getByRole('button',{name:/^One full-size strip/}).click();await ready();assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg image[data-pose]').count(),4);assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-strip-mode'),'single');pass('single-centered-strip-option');
  await page.getByTestId('layout-card').click();await ready();assert.equal(await page.locator('.ksStudio').getAttribute('data-output-layout'),'card');assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-layout')==='photo_strip',false);
  await page.getByTestId('layout-strip').click();await ready();assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-strip-mode'),'single');assert.equal(await page.evaluate(()=>window.__draws.length),4);assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'4');pass('format-switches-do-not-recapture-or-use-print-allowance');
  await page.getByRole('button',{name:'Print test sheet',exact:true}).click();assert.equal(await page.evaluate(()=>window.__prints),1);assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.demoUsage),'4');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');await page.getByTestId('wireless-print-panel').waitFor();await page.getByRole('button',{name:'Not printed — keep my photo'}).click();pass('one-demo-wireless-sheet-opens-dialog-and-preserves-allowance');
  const saved=await records();assert.equal(saved.length,1);assert.equal(new Set(saved[0].poses).size,4);assert(saved[0].keepsake>0);pass('original-poses-and-final-strip-keepsake-are-archived');assert.deepEqual(page.__errors,[]);
  await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await page.getByRole('tab',{name:'Design',exact:false}).click();await page.getByLabel('Enable 4×6 Card',{exact:true}).uncheck();await page.getByLabel('Strips per printed sheet',{exact:true}).selectOption('single');await page.getByLabel('Strip footer text (optional)',{exact:true}).fill('Happy party memories');await page.getByRole('button',{name:/^Save changes/}).click();const config=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),EVENT_KEYS.config);assert.equal(config.printLayouts.defaultLayout,'photo_strip');assert.equal(config.printLayouts.stripMode,'single');assert.equal(config.printLayouts.footerText,'Happy party memories');assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'17');assert.deepEqual(await records(),saved);pass('staff-format-settings-save-without-changing-existing-photos-or-counters');
  await page.getByRole('button',{name:'Try office demo →',exact:true}).click();await page.getByTestId('welcome-four-photo').waitFor();await capture();assert.equal(await page.locator('.ksStudio').getAttribute('data-output-layout'),'photo_strip');assert.equal(await page.getByTestId('layout-card').count(),0);assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').getAttribute('data-strip-mode'),'single');assert((await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg').innerHTML()).includes('Happy party memories'));pass('staff-strip-only-default-reaches-real-guest-print-page');
  await open({demo:false});await capture();await page.getByTestId('layout-strip').click();await ready();await page.emulateMedia({media:'print'});assert.equal(await page.locator('.ksPrintOnly img.ksExactPrintImage').isVisible(),true);assert.equal(await page.locator('.psLayoutBar').isVisible(),false);await page.emulateMedia({media:'screen'});await page.getByRole('button',{name:'Print 1 Sheet',exact:true}).click();assert.equal(await page.evaluate(()=>window.__prints),1);assert.equal(await page.evaluate(k=>localStorage.getItem(k),EVENT_KEYS.liveUsage),'18');await page.getByTestId('wireless-print-panel').waitFor();await page.getByRole('button',{name:'A physical sheet printed'}).click();assert.equal(await page.getByTestId('layout-card').isDisabled(),true);pass('single-strip-print-request-requires-confirmed-paper-before-locking-design');assert.deepEqual(page.__errors,[]);
  await open({settings:{cardEnabled:false,stripEnabled:true,defaultLayout:'photo_strip'}});assert.equal(await page.getByTestId('welcome-quick-photo').count(),1,'one-photo choice remains offered when four-photo strips are preferred');await page.getByTestId('welcome-quick-photo').click();await page.locator('.ksStudio').waitFor({timeout:30000});await ready();assert.equal(await page.evaluate(()=>window.__draws.length),1);assert.equal(await page.locator('.ksStudio').getAttribute('data-output-layout'),'card');assert.equal(await page.locator('.ksGallery .ksChoice.isSelected .designPrint > svg image[data-guest-photo]').first().getAttribute('preserveAspectRatio'),'xMidYMid slice');assert.equal(await page.getByTestId('layout-strip').count(),0);pass('quick-photo-fills-card-by-default-and-does-not-offer-a-strip');
 }catch(error){results.push({engine,passed:false,message:error.message,stack:error.stack});if(page)await page.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});throw error;}
 finally{await browser.close();await writeFile(`${out}/results.json`,JSON.stringify({base,version:BOOTH_RELEASE,results},null,2));}
}
console.log(JSON.stringify({base,version:BOOTH_RELEASE,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length}));
