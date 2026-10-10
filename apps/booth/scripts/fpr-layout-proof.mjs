import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import sharp from 'sharp';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {FPR_PRINT_PRESETS} from '../app/lib/fpr-print-presets.mjs';
import {LEGACY_KEYS,octoberPreset} from '../app/lib/event-workspace.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {assertFinishedGuest} from './assert-finished-guest.mjs';

// Fresh, isolated fixture storage. Public production mode checks welcome only;
// it never starts a session or changes a real event, allowance, or backend file.
const base=(process.env.FPR_LAYOUT_BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const origin=new URL(base).origin,local=['localhost','127.0.0.1'].includes(new URL(base).hostname);
const production='https://photobooth-booth-production.up.railway.app';
const ignoreHTTPSErrors=process.env.FPR_LAYOUT_LIVE_IGNORE_HTTPS_ERRORS==='1';
assert(!ignoreHTTPSErrors||origin===production,'TLS-ignore smoke is limited to the known public Railway booth');
let proxy;
if(process.env.FPR_LAYOUT_LIVE_PROXY==='1'){
 const value=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;assert(value,'Managed proxy smoke needs HTTPS_PROXY or HTTP_PROXY');
 const url=new URL(value);proxy={server:`${url.protocol}//${url.host}`,...(url.username?{username:decodeURIComponent(url.username),password:decodeURIComponent(url.password)}:{})};
}
const out='fpr-layout-proof',results=[];await mkdir(out,{recursive:true});
const exportSource=await readFile(new URL('../app/lib/keepsake-export.mjs',import.meta.url),'utf8');
const archiveSource=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const engines=process.env.FPR_LAYOUT_CHROMIUM_ONLY==='1'?[['chromium',chromium]]:[['chromium',chromium],['webkit',webkit]];
const presetType={graduation:'graduation',wedding:'wedding',birthday:'birthday',quince:'other',corporate:'corporate'};
const configFor=preset=>({...octoberPreset(),type:presetType[preset.key],title:'Approved '+preset.name+' Event',date:'October 10, 2026',guestMode:'approved',approvedPrintName:'Customer Approved Name',defaultTemplate:preset.id,photoFit:'fill',details:{eventName:'Customer Approved Name',classYear:'2026'},photoPauseSeconds:4});

async function openingGeometry(svg,count,label){
 const info=await svg.evaluate(element=>({
  preset:element.getAttribute('data-fpr-preset'),viewBox:element.getAttribute('viewBox'),
  groups:element.querySelectorAll('[data-approved-photo-region="true"]').length,
  images:[...element.querySelectorAll('image[data-guest-photo="true"]')].map(image=>({pose:Number(image.getAttribute('data-pose')),source:image.getAttribute('href'),x:Number(image.getAttribute('x')),y:Number(image.getAttribute('y')),width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))}))
 }));
 assert.equal(info.viewBox,'0 0 1200 1800',label+' is a real 4x6 print');
 assert.equal(info.groups,count,label+' has exactly '+count+' actual photo openings');
 assert.equal(info.images.length,count,label+' has exactly '+count+' guest photos');
 assert.deepEqual(info.images.map(image=>image.pose),Array.from({length:count},(_,index)=>index+1),label+' uses each pose exactly once, in order');
 assert.equal(new Set(info.images.map(image=>image.source)).size,count,label+' shows distinct sample poses');
 for(const image of info.images){
  assert(image.width>100&&image.height>100,label+' has large visible photo openings');
  assert(image.x>=0&&image.y>=0&&image.x+image.width<=1200.02&&image.y+image.height<=1800.02,label+' photos stay on the sheet');
 }
 if(count===4){
  const first=info.images[0];
  for(const image of info.images){assert(Math.abs(image.width-first.width)<.02&&Math.abs(image.height-first.height)<.02,label+' four poses get equal photo areas');}
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
   const a=info.images[i],b=info.images[j];
   assert(a.x+a.width<=b.x+.02||b.x+b.width<=a.x+.02||a.y+a.height<=b.y+.02||b.y+b.height<=a.y+.02,label+' four photo areas are separate');
  }
 }
 return {...info,images:info.images.map(({source,...image})=>image)};
}

// Run the actual production SVG-to-JPEG exporter in the browser using the SVG
// already rendered by PrintCard. This also exercises WebKit's image loading.
async function exportSvg(page,svg,source,layout){
 return page.evaluate(async({svg,source,layout})=>{
  const api=new Function('renderKeepsake',source.replace(/^import .*;\n/,'').replace(/\bexport /g,'')+'\nreturn {makeKeepsakeExport};')(()=>svg);
  const artifact=await api.makeKeepsakeExport({photo:'data:image/jpeg;base64,/9j/2Q==',layout,cfg:{title:'Layout proof'}});
  return Array.from(new Uint8Array(await artifact.blob.arrayBuffer()));
 },{svg,source,layout});
}

async function openFixture(browser,preset){
 const config=configFor(preset),context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block',ignoreHTTPSErrors});
 const writes=[],errors=[],protectedVisits=[];
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['GET','HEAD'].includes(request.method())){writes.push({method:request.method(),path:url.pathname});return route.abort();}
  if(/^\/(setup|event-prep|event-studio|staff)(\/|$)/.test(url.pathname)){protectedVisits.push(url.pathname);return route.abort();}
  return url.origin===origin?route.continue():route.abort();
 });
 await context.addInitScript(({config,keys})=>{
  localStorage.setItem(keys.config,JSON.stringify(config));localStorage.setItem(keys.usage,'19');
  window.__layoutPrints=0;window.__layoutShares=0;window.__layoutCameraStarts=0;
  window.print=()=>{window.__layoutPrints++;throw new Error('Layout proof must not print');};
  Object.defineProperty(navigator,'share',{configurable:true,value:()=>{window.__layoutShares++;throw new Error('Layout proof must not send');}});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.__layoutCameraStarts++;throw new Error('Welcome-only proof must not open the camera');}}});
 },{config,keys:LEGACY_KEYS});
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/?local=1',{waitUntil:'networkidle'});
 const release=await page.evaluate(async()=>{const response=await fetch('/api/app-version',{cache:'no-store'});return response.json();});
 assert.equal(release.version,BOOTH_RELEASE);
 await page.waitForFunction(key=>[...document.querySelectorAll('.bwLayoutPreview')].length===3&&[...document.querySelectorAll('.bwLayoutPreview')].every(element=>element.dataset.examplePoses==='ready'&&element.querySelector('svg')?.getAttribute('data-fpr-preset')===key),preset.key);
 return {page,context,config,writes,errors,protectedVisits};
}

async function welcomeCase(browser,engine,preset){
 const fixture=await openFixture(browser,preset),{page,context,config,writes,errors,protectedVisits}=fixture;
 const label=engine+'-'+preset.key,layouts={};
 try{
  for(const count of [1,4]){
   const choice=page.getByTestId(count===1?'welcome-quick-photo':'welcome-four-photo'),thumbnail=choice.locator('.bwLayoutPreview svg[data-fpr-preset]');
   const small=await openingGeometry(thumbnail,count,label+' thumbnail '+count);
   assert.equal(small.preset,preset.key);
   await choice.click();assert.equal(await page.getByTestId('welcome-large-proof').getAttribute('data-selected-photos'),String(count));
   const large=page.getByTestId('welcome-large-proof').locator('.bwLayoutPreview svg[data-fpr-preset]'),geometry=await openingGeometry(large,count,label+' large preview '+count);
   assert.deepEqual(geometry,small,label+' thumbnail and large preview have identical photo geometry');
   layouts[count]=geometry;
   await page.screenshot({path:`${out}/${label}-${count}-welcome.png`});
   const svg=await large.evaluate(element=>element.outerHTML),bytes=Buffer.from(await exportSvg(page,svg,exportSource,count===1?'card':'photo_strip'));
   const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,1200);assert.equal(metadata.height,1800);
   // Make the full-resolution, actual approved layouts available for visual QA.
   await writeFile(`${out}/${label}-${count}-artwork.jpg`,bytes);
  }
  const one=layouts[1].images[0],four=layouts[4].images[0];
  assert(one.width>=four.width-.02&&one.height>four.height*3,label+' one photo is clearly larger than each of four photos');
  assert.equal(await page.locator('.pcStage,[data-testid="approved-guest-preview"]').count(),0,'choosing a preview never starts capture');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEYS.usage),'19');
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).defaultTemplate,LEGACY_KEYS.config),config.defaultTemplate);
  assert.deepEqual(await page.evaluate(()=>({prints:window.__layoutPrints,shares:window.__layoutShares,cameraStarts:window.__layoutCameraStarts})),{prints:0,shares:0,cameraStarts:0});
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.deepEqual(protectedVisits,[]);
  results.push({test:label+'-welcome-and-full-resolution-artwork',passed:true,release:BOOTH_RELEASE,layouts,writeRequests:writes});
 }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`,fullPage:true}).catch(()=>{});throw error;}
 finally{await context.close();}
}

async function captureCase(browser,engine,count){
 assert(local,'Actual fixture captures are restricted to a local test server');
 const preset=FPR_PRINT_PRESETS.find(preset=>preset.key==='graduation'),fixture=await openFixture(browser,preset),{page,context,config,writes,errors,protectedVisits}=fixture;
 const label=engine+'-graduation-'+count+'-capture';
 try{
  await page.evaluate(()=>{
   Object.defineProperty(window,'AudioContext',{configurable:true,value:class{constructor(){throw new Error('Use visual countdown');}}});
   Object.defineProperty(window,'webkitAudioContext',{configurable:true,value:undefined});
   Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async options=>{
    if(options.audio!==false)throw new Error('Capture must not request microphone');window.__layoutCameraStarts++;
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');let frame=0;
    const draw=()=>{frame++;ctx.fillStyle=['#286888','#6f396b','#5b7941','#8e512d'][Math.floor(frame/8)%4];ctx.fillRect(0,0,640,480);ctx.fillStyle='#fff9e0';ctx.font='bold 62px sans-serif';ctx.fillText('POSE '+frame,100,245);ctx.fillRect(frame%580,310,26,28);};
    draw();const stream=canvas.captureStream(20),timer=setInterval(draw,70),track=stream.getVideoTracks()[0],stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};return stream;
   }}});
  });
  if(engine==='webkit')await page.bringToFront();
  await page.getByTestId(count===1?'welcome-quick-photo':'welcome-four-photo').click();await page.getByTestId('welcome-start-session').click();
  const deadline=Date.now()+100000;
  while(!await page.getByTestId('approved-guest-preview').count()){
   assert(Date.now()<deadline,label+' capture finishes');const ready=page.getByRole('button',{name:/I’m ready — start countdown/});if(await ready.count())await ready.click().catch(()=>{});await page.waitForTimeout(120);
  }
  const finished=await assertFinishedGuest(page,count),metadata=await sharp(finished).metadata();
  assert.equal(metadata.width,1200);assert.equal(metadata.height,1800);
  await writeFile(`${out}/${label}-finished.jpg`,finished);await page.screenshot({path:`${out}/${label}-finished-screen.png`});
  const stored=await page.evaluate(async source=>{
   const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {listCaptures};')(),rows=await api.listCaptures('legacy');
   const dataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
   return {count:rows.length,poses:await Promise.all(rows[0].poses.map(dataUrl)),keepsake:Array.from(new Uint8Array(await rows[0].keepsake.arrayBuffer()))};
  },archiveSource);
  assert.equal(stored.count,1);assert.equal(stored.poses.length,count);assert.equal(new Set(stored.poses).size,count,'every actual captured pose is distinct');
  assert.deepEqual(Buffer.from(stored.keepsake),finished,'archive preserves the exact finished JPEG');
  const svg=renderKeepsake({cfg:config,template:config.defaultTemplate,photo:stored.poses[0],poses:stored.poses,layout:count===1?'card':'photo_strip',stripMode:'single',filter:'none',id:'export-card'});
  const expected=Buffer.from(await exportSvg(page,svg,exportSource,count===1?'card':'photo_strip'));
  assert.deepEqual(finished,expected,'actual finished JPEG uses the same corrected artwork and each archived pose exactly once');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),LEGACY_KEYS.usage),'19');
  assert.deepEqual(await page.evaluate(()=>({prints:window.__layoutPrints,shares:window.__layoutShares,cameraStarts:window.__layoutCameraStarts})),{prints:0,shares:0,cameraStarts:1});
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.deepEqual(protectedVisits,[]);
  results.push({test:label,passed:true,actualPoses:count,uniquePoses:new Set(stored.poses).size,exactSharedRendererJPEG:true,exactArchivedJPEG:true,writeRequests:writes});
 }catch(error){await page.screenshot({path:`${out}/${label}-failure.png`,fullPage:true}).catch(()=>{});throw error;}
 finally{await context.close();}
}

try{
 for(const [engine,api]of engines){
  const browser=await api.launch({headless:true,...(proxy?{proxy}:{}),...(engine==='chromium'?{args:['--no-sandbox']}: {})});
  try{for(const preset of FPR_PRINT_PRESETS)await welcomeCase(browser,engine,preset);if(local)for(const count of [1,4])await captureCase(browser,engine,count);}
  finally{await browser.close();}
 }
}catch(error){results.push({test:'failure',passed:false,message:error.message,stack:error.stack});console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,expectedRelease:BOOTH_RELEASE,mode:local?'welcome-artwork-and-local-capture':'read-only-welcome-artwork',results},null,2));
console.log(JSON.stringify({base,release:BOOTH_RELEASE,passed:results.filter(result=>result.passed).length,failed:results.filter(result=>!result.passed).length,localFixtureCaptures:local},null,2));
