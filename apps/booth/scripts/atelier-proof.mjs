// Actual Next production build in a CI runner. No provider key, real message, or hardware claim.
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const out='proof-output';await mkdir(out,{recursive:true});const base='http://127.0.0.1:3000';
let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready,'Next server did not start');
const source='https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85';
const imageResponse=await fetch(source);assert(imageResponse.ok);const sample=Buffer.from(await imageResponse.arrayBuffer());await writeFile(out+'/sample-photo.jpg',sample);const photo='data:image/jpeg;base64,'+sample.toString('base64');
const fixtures={wedding:{title:'Alex & Jordan',subtitle:'The Garden House',details:{partner1:'Alex',partner2:'Jordan',venue:'The Garden House'}},birthday:{title:'Taylor',subtitle:'A night to remember',details:{honoree:'Taylor',age:'30',theme:'A night to remember'}},mitzvah:{title:'Sam',subtitle:'Family & friends',details:{honoree:'Sam',mitzvahType:'Bar Mitzvah'}},graduation:{title:'Morgan',subtitle:'Syracuse University',details:{graduate:'Morgan',classYear:'2026',school:'Syracuse University'}},corporate:{title:'NORTH & CO.',subtitle:'Annual Celebration',details:{company:'NORTH & CO.',eventName:'Annual Celebration'}},other:{title:'Golden Anniversary',subtitle:'Together through the years',details:{eventName:'Golden Anniversary',subtitle:'Together through the years'}}};
const report={productionMessagesSent:0,physicalPrint:false,sourcePhoto:source,photoNote:'Illustrative stock photograph from Unsplash; sample event names. Not the user’s wedding.',browserChecks:[],exports:[],printSimulation:[],longNameChecks:[]};
async function checkpoint(){await writeFile(out+'/verification.json',JSON.stringify(report,null,2));}
async function recover(page,type,fixture){await page.goto(base);await page.evaluate(({photo,fixture,type})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type,date:'SEPTEMBER 21, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,fixture,type});await page.reload();for(let i=0;i<5;i++)await page.getByRole('button',{name:'Operator controls (tap five times)'}).click();await page.locator('.recoveryGrid button').first().click();await page.locator('.ksGallery').waitFor();await page.getByRole('button',{name:'Save / Send',exact:true}).waitFor();}
for(const browserType of [chromium,webkit]){
 const browser=await browserType.launch({headless:true});
 for(const [type,fixture]of Object.entries(fixtures)){
  const p=await browser.newPage({viewport:{width:1180,height:820},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/attribute|path|svg|Uncaught/i.test(m.text()))errors.push(m.text());});await p.route('**/api/delivery',route=>route.abort());
  try{
   await recover(p,type,fixture);
   if(type==='wedding')for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:820,height:1180}]){await p.setViewportSize(viewport);await p.screenshot({path:`${out}/${browserType.name()}-gallery-${viewport.width}.png`});const m=await p.locator('.ksDock').boundingBox();assert(m.y+m.height<=viewport.height+1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.browserChecks.push({browser:browserType.name(),viewport,dockVisible:true});}
   await p.setViewportSize({width:1180,height:820});await p.screenshot({path:`${out}/${browserType.name()}-${type}-side-by-side.png`});
   for(let i=0;i<3;i++){
    await p.locator('.ksSelect').nth(i).click();await p.getByRole('button',{name:'Save / Send',exact:true}).click();const promise=p.waitForEvent('download');await p.getByRole('button',{name:'Download Keepsake',exact:true}).click();const download=await promise;const filename=`${out}/${browserType.name()}-${type}-${i}.jpg`;await download.saveAs(filename);
    const info=await sharp(filename).metadata(),bytes=(await readFile(filename)).length;assert.equal(info.width,1200);assert.equal(info.height,1800);assert(bytes<2097152,'Export exceeds the delivery size limit');
    report.exports.push({browser:browserType.name(),type,design:i,width:info.width,height:info.height,bytes});await p.getByRole('button',{name:'Close dialog',exact:true}).click();await checkpoint();
   }
   if(browserType===chromium){await p.emulateMedia({media:'print'});await p.pdf({path:`${out}/${type}-print-simulation.pdf`,preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});report.printSimulation.push(type);}
   if(type==='wedding'){
    await recover(p,type,{...fixture,title:'Alexandria Montgomery & Christopher Wainwright',details:{partner1:'Alexandria Montgomery',partner2:'Christopher Wainwright',venue:'A very special celebration at The Garden House'}});
    const bounds=await p.locator('.ksGallery [data-text-role="name"]').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));
    assert.equal(bounds.length,3);for(const b of bounds){assert(b.x>=65&&b.right<=1135);assert(b.y>=1379&&b.bottom<=1617,'Name collides with photo/caption');}
    await p.screenshot({path:`${out}/${browserType.name()}-long-names.png`});report.longNameChecks.push({browser:browserType.name(),bounds});
   }
   assert.deepEqual(errors,[]);await checkpoint();
  }catch(error){await p.screenshot({path:`${out}/${browserType.name()}-${type}-failure.png`}).catch(()=>{});report.failure={browser:browserType.name(),type,message:error.message,errors};await checkpoint();throw error;}finally{await p.close();}
 }
 await browser.close();
}
report.completed=true;await checkpoint();console.log(JSON.stringify({browserViewportChecks:report.browserChecks.length,actualNextJpegExports:report.exports.length,printSimulations:report.printSimulation.length,errors:0}));
