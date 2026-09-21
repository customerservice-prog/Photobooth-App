// Exercises the actual Next build in a network-enabled CI runner, never production sending.
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const out='proof-output';await mkdir(out,{recursive:true});const base='http://127.0.0.1:3000';
for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
const source='https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85';
const imageResponse=await fetch(source);assert(imageResponse.ok);const sample=Buffer.from(await imageResponse.arrayBuffer());await writeFile(out+'/sample-photo.jpg',sample);const photo='data:image/jpeg;base64,'+sample.toString('base64');
const fixtures={wedding:{title:'Alex & Jordan',subtitle:'The Garden House',details:{partner1:'Alex',partner2:'Jordan',venue:'The Garden House'}},birthday:{title:'Taylor',subtitle:'A night to remember',details:{honoree:'Taylor',age:'30',theme:'A night to remember'}},mitzvah:{title:'Sam',subtitle:'Family & friends',details:{honoree:'Sam',mitzvahType:'Bar Mitzvah'}},graduation:{title:'Morgan',subtitle:'Syracuse University',details:{graduate:'Morgan',classYear:'2026',school:'Syracuse University'}},corporate:{title:'NORTH & CO.',subtitle:'Annual Celebration',details:{company:'NORTH & CO.',eventName:'Annual Celebration'}},other:{title:'Golden Anniversary',subtitle:'Together through the years',details:{eventName:'Golden Anniversary',subtitle:'Together through the years'}}};
const report={productionMessagesSent:0,physicalPrint:false,sourcePhoto:source,photoNote:'Illustrative stock photograph from Unsplash; sample event names. Not the user’s wedding.',browserChecks:[],exports:[],printSimulation:[]};
for(const browserType of [chromium,webkit]){
 const browser=await browserType.launch({headless:true});const context=await browser.newContext({viewport:{width:1180,height:820},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Never contact delivery provider; the real config endpoint is allowed and reports disabled.
 await page.route('**/api/delivery',route=>route.abort());
 await page.addInitScript(({photo,fixture})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type:'wedding',date:'SEPTEMBER 21, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,fixture:fixtures.wedding});
 await page.goto(base);const operator=page.getByRole('button',{name:'Operator controls (tap five times)'});for(let i=0;i<5;i++)await operator.click();await page.locator('.recoveryGrid button').first().click();await page.locator('.ksGallery').waitFor();await page.getByRole('button',{name:'Save / Send',exact:true}).waitFor();
 for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:820,height:1180}]){await page.setViewportSize(viewport);await page.screenshot({path:`${out}/${browserType.name()}-gallery-${viewport.width}.png`});const m=await page.locator('.ksDock').boundingBox();assert(m.y+m.height<=viewport.height+1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.browserChecks.push({browser:browserType.name(),viewport,dockVisible:true});}
 await page.setViewportSize({width:1180,height:820});
 for(const [type,fixture]of Object.entries(fixtures)){
  await page.evaluate(({photo,fixture,type})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type,date:'SEPTEMBER 21, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,fixture,type});
  // The initial seed script is removed by creating another page in a fresh context for each collection.
  const p=await browser.newPage({viewport:{width:1180,height:820},acceptDownloads:true});const pe=[];p.on('pageerror',e=>pe.push(e.message));await p.goto(base);await p.evaluate(({photo,fixture,type})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type,date:'SEPTEMBER 21, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,fixture,type});await p.reload();for(let i=0;i<5;i++)await p.getByRole('button',{name:'Operator controls (tap five times)'}).click();await p.locator('.recoveryGrid button').first().click();await p.locator('.ksGallery').waitFor();await p.getByRole('button',{name:'Save / Send',exact:true}).waitFor();
  await p.screenshot({path:`${out}/${browserType.name()}-${type}-side-by-side.png`});
  for(let i=0;i<3;i++){await p.locator('.ksSelect').nth(i).click();const save=p.getByRole('button',{name:'Save / Send',exact:true});await save.waitFor();await save.click();const promise=p.waitForEvent('download');await p.getByRole('button',{name:'Download Keepsake',exact:true}).click();const download=await promise;const filename=`${out}/${browserType.name()}-${type}-${i}.jpg`;await download.saveAs(filename);const info=await sharp(filename).metadata();assert.equal(info.width,1200);assert.equal(info.height,1800);assert(info.size<2097152);report.exports.push({browser:browserType.name(),type,design:i,width:info.width,height:info.height,bytes:info.size});await p.getByRole('button',{name:'Close dialog',exact:true}).click();}
  if(browserType===chromium){await p.emulateMedia({media:'print'});await p.pdf({path:`${out}/${type}-print-simulation.pdf`,preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});report.printSimulation.push(type);}
  assert.deepEqual(pe,[]);await p.close();
 }
 assert.deepEqual(errors,[]);await browser.close();
}
await writeFile(out+'/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({browserViewportChecks:report.browserChecks.length,actualNextJpegExports:report.exports.length,printSimulations:report.printSimulation.length,errors:0}));
