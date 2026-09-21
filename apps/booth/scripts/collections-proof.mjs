// Exercise the built Next application. Test browser sessions contain only illustrative fixtures.
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const out='proof-output';await mkdir(out,{recursive:true});const base='http://127.0.0.1:3000';
let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready,'Built Next server did not start');
const meta=await(await fetch(base+'/api/template-catalog')).json();assert.equal(meta.version,'event-collections-v1');assert.equal(meta.count,18);
const source='https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85';
const response=await fetch(source,{signal:AbortSignal.timeout(30000)});assert(response.ok);const sample=Buffer.from(await response.arrayBuffer());await writeFile(out+'/sample-photo.jpg',sample);const photo='data:image/jpeg;base64,'+sample.toString('base64');
const fixtures={wedding:{title:'Alex & Jordan',subtitle:'The Garden House',details:{partner1:'Alex',partner2:'Jordan',venue:'The Garden House'}},birthday:{title:'Taylor',subtitle:'A night to remember',details:{honoree:'Taylor',age:'30',theme:'A night to remember'}},mitzvah:{title:'Sam',subtitle:'Family & friends',details:{honoree:'Sam',mitzvahType:'Bar Mitzvah',symbols:'Geometric only'}},graduation:{title:'Morgan',subtitle:'Graduation Celebration',details:{graduate:'Morgan',classYear:'2026',school:'Graduation Celebration'}},corporate:{title:'NORTH & CO.',subtitle:'Annual Celebration',details:{company:'NORTH & CO.',eventName:'Annual Celebration',tagline:'People. Ideas. Possibility.'}},other:{title:'Golden Anniversary',subtitle:'Together through the years',details:{eventName:'Golden Anniversary',honoree:'The Carters',subtitle:'Together through the years'}}};
const report={commit:process.env.GITHUB_SHA,productionMessagesSent:0,physicalPrint:false,sourcePhoto:source,photoNote:'Illustrative stock QA photograph. Fictional event identities; not customer records.',exports:[],printProofs:[],viewports:[],forms:[],actions:[],errors:[]};
const checkpoint=()=>writeFile(out+'/collection-verification.json',JSON.stringify(report,null,2));
async function recover(p,type,fixture){await p.goto(base);await p.evaluate(({photo,type,fixture})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type,date:'SEPTEMBER 22, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,type,fixture});await p.reload();for(let i=0;i<5;i++)await p.getByRole('button',{name:'Operator controls (tap five times)'}).click();await p.locator('.recoveryGrid button').first().click();await p.locator('.ksGallery').waitFor();await p.getByRole('button',{name:'Save / Send',exact:true}).waitFor();}
async function saveJpeg(p,file){await p.getByRole('button',{name:'Save / Send',exact:true}).click();const pending=p.waitForEvent('download');await p.getByRole('button',{name:'Download Keepsake',exact:true}).click();await(await pending).saveAs(file);await p.getByRole('button',{name:'Close dialog',exact:true}).click();const bytes=(await readFile(file)).length,m=await sharp(file).metadata();assert.equal(m.width,1200);assert.equal(m.height,1800);assert(bytes<2097152);return {bytes,width:m.width,height:m.height};}
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 for(const [event,fixture]of Object.entries(fixtures)){
  const p=await browser.newPage({viewport:{width:1180,height:820},acceptDownloads:true});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/attribute|path|svg|Uncaught/i.test(m.text()))report.errors.push(m.text());});await p.route('**/api/delivery',r=>r.abort());
  try{
   await recover(p,event,fixture);const collection=meta.events.find(e=>e.eventType===event);
   assert.equal(await p.locator('.ksSelect').count(),3);
   for(let i=0;i<3;i++){
    const t=collection.templates[i];assert.equal(await p.locator('.ksSelect .designPrint > svg').nth(i).getAttribute('data-template-id'),t.id);
    await p.locator('.ksSelect').nth(i).click();assert.equal(await p.locator('.ksSelect').nth(i).getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.ksPrintOnly .designPrint > svg').getAttribute('data-template-id'),t.id);
    const info=await saveJpeg(p,`${out}/${engine.name()}-${event}-${i}.jpg`);report.exports.push({browser:engine.name(),event,id:t.id,...info});
    if(engine===chromium){await p.emulateMedia({media:'print'});const buf=await p.pdf({path:`${out}/print-${t.id}.pdf`,preferCSSPageSize:true,printBackground:true});const raw=buf.toString('latin1');assert.match(raw,/\/MediaBox\s*\[\s*0\s+0\s+288\s+432\s*\]/);assert.equal((raw.match(/\/Type\s*\/Page\b/g)||[]).length,1);report.printProofs.push({id:t.id,pages:1,points:[288,432]});await p.emulateMedia({media:'screen'});}
    await checkpoint();
   }
   await p.screenshot({path:`${out}/${engine.name()}-${event}-gallery.png`});
   const boxes=await p.locator('.ksGallery [data-text-role="name"]').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));assert.equal(boxes.length,3);for(const b of boxes)assert(b.x>=45&&b.right<=1155&&b.y>=1375&&b.bottom<=1617,JSON.stringify({event,b}));
   await p.getByRole('button',{name:'Event setup',exact:true}).click();await p.getByRole('button',{name:/Personalize this event/}).click();
   for(const [name,value]of Object.entries(fixture.details)){const field=p.locator(`[name="${name}"]`);if(await field.count()){if((await field.evaluate(e=>e.tagName))==='SELECT')await field.selectOption(value);else await field.fill(value);}}
   await p.locator('[name="default-design"][value="champagne"]').check();await p.getByRole('button',{name:/Save event & continue/}).click();await p.locator('.ksGallery').waitFor();
   const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-event-v1')));assert.equal(saved.defaultTemplateId,collection.templates[2].id);report.forms.push({browser:engine.name(),event,savedDefault:saved.defaultTemplateId});
   if(event==='wedding'){
    for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:820,height:1180},{width:768,height:1024},{width:1366,height:1024},{width:390,height:844}]){await p.setViewportSize(viewport);const b=await p.locator('.ksDock').boundingBox();assert(b.y>=0&&b.y+b.height<=viewport.height+1);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.viewports.push({browser:engine.name(),viewport,dockVisible:true});await p.screenshot({path:`${out}/${engine.name()}-viewport-${viewport.width}.png`});}
    await p.setViewportSize({width:1180,height:820});
    await p.evaluate(()=>{window.__printed=0;window.print=()=>{window.__printed++;setTimeout(()=>dispatchEvent(new Event('afterprint')),50);};});await p.getByRole('button',{name:'Print Keepsake',exact:true}).click();await p.getByRole('button',{name:'Print Keepsake',exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.__printed),1);report.actions.push({browser:engine.name(),printCallback:true});
    await p.getByRole('button',{name:/Photo adjustments/}).click();await p.getByRole('button',{name:'Black & white',exact:true}).click();await p.getByLabel('Show the whole photo').check();await p.getByRole('button',{name:'Apply & return',exact:true}).click();assert(await p.locator('.ksPrintOnly svg [data-guest-photo]').evaluate(e=>e.getAttribute('preserveAspectRatio').includes('meet')));await saveJpeg(p,`${out}/${engine.name()}-wedding-whole-photo-bw.jpg`);
    await p.getByRole('button',{name:'Help with the booth',exact:true}).click();await p.getByRole('button',{name:'Back to my photo',exact:true}).click();assert.equal(await p.locator('.ksGallery').count(),1);
    await p.getByRole('button',{name:/^Done/}).click();await p.getByRole('button',{name:/^Take a Photo/}).waitFor({timeout:9000});report.actions.push({browser:engine.name(),doneReset:true,helpPreservesPhoto:true});
   }
   assert.deepEqual(report.errors,[]);await checkpoint();
  }catch(e){report.failure={browser:engine.name(),event,error:e.message};await p.screenshot({path:`${out}/${engine.name()}-${event}-FAIL.png`}).catch(()=>{});await checkpoint();throw e;}finally{await p.close();}
 }
 await browser.close();
}
report.completed=true;await checkpoint();console.log(JSON.stringify({exports:report.exports.length,printProofs:report.printProofs.length,forms:report.forms.length,viewports:report.viewports.length,errors:report.errors.length}));
