// Exercises the real built app on localhost. Provider POSTs are blocked; no actual guest data.
import {chromium,webkit} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {getDesigns} from '../app/lib/keepsake-designs.mjs';
const out='family-proof',base='http://127.0.0.1:3000';await mkdir(out,{recursive:true});
let ready=false;for(let i=0;i<60;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(ready,'Built Next server did not start');
const source='https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85';
const response=await fetch(source);assert(response.ok,'Illustrative test image unavailable');const sample=Buffer.from(await response.arrayBuffer());await writeFile(out+'/sample-photo.jpg',sample);const photo='data:image/jpeg;base64,'+sample.toString('base64');
const fixtures={wedding:{title:'Alex & Jordan',subtitle:'The Garden House',details:{partner1:'Alex',partner2:'Jordan',venue:'The Garden House'}},birthday:{title:'Taylor',subtitle:'A night to remember',details:{honoree:'Taylor',age:'30',theme:'A night to remember'}},mitzvah:{title:'Maya',subtitle:'Family & friends',details:{honoree:'Maya',mitzvahType:'Bat Mitzvah',hebrewName:'שרה'}},graduation:{title:'Morgan',subtitle:'Example University',details:{graduate:'Morgan',classYear:'2029',school:'Example University'}},corporate:{title:'NORTH & CO.',subtitle:'Annual Celebration',details:{company:'NORTH & CO.',eventName:'Annual Celebration'}},other:{title:'Golden Anniversary',subtitle:'Together through the years',details:{eventName:'Golden Anniversary',honoree:'The Carters',subtitle:'Together through the years'}}};
const report={sourcePhoto:source,photoNote:'Illustrative stock photo for software QA, fictional event names. Not a real guest event.',productionMessagesSent:0,physicalPrinterTest:false,exports:[],viewportChecks:[],bounds:[],pdfs:[],errors:[]};
const checkpoint=()=>writeFile(out+'/verification.json',JSON.stringify(report,null,2));
async function recover(p,type,fixture){await p.goto(base);await p.evaluate(({photo,type,fixture})=>{localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...fixture,type,date:'SEPTEMBER 21, 2026',setupComplete:true}));localStorage.setItem('friendly-booth-photos-v1',JSON.stringify([{id:1,data:photo,createdAt:new Date().toISOString()}]));},{photo,type,fixture});await p.reload();for(let i=0;i<5;i++)await p.getByRole('button',{name:'Operator controls (tap five times)'}).click();await p.locator('.recoveryGrid button').first().click();await p.locator('.ksGallery').waitFor();await p.getByRole('button',{name:'Save / Send',exact:true}).waitFor();}
async function download(p,filename){await p.getByRole('button',{name:'Save / Send',exact:true}).click();const waiting=p.waitForEvent('download');await p.getByRole('button',{name:'Download Keepsake',exact:true}).click();await(await waiting).saveAs(filename);await p.getByRole('button',{name:'Close dialog',exact:true}).click();}
function digest(data){return createHash('sha256').update(data).digest('hex');}
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 for(const [type,fixture]of Object.entries(fixtures)){
  const p=await browser.newPage({viewport:{width:1180,height:820},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/attribute|path|svg|Uncaught/i.test(m.text()))errors.push(m.text());});await p.route('**/api/delivery',route=>route.abort());
  try{
   await recover(p,type,fixture);await p.screenshot({path:`${out}/${engine.name()}-${type}-gallery.png`});
   const keys=await p.locator('.ksGallery svg[data-template-key]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-template-key')));assert.deepEqual(keys,getDesigns(type).map(d=>d.key));
   for(const viewport of [{width:1180,height:820},{width:1024,height:768},{width:820,height:1180}]){await p.setViewportSize(viewport);const dock=await p.locator('.ksDock').boundingBox();assert(dock.y>=0&&dock.y+dock.height<=viewport.height+1,'Action dock not reachable');assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');report.viewportChecks.push({browser:engine.name(),type,...viewport,dockVisible:true});}
   await p.setViewportSize({width:1180,height:820});const hashes=[];
   for(let i=0;i<3;i++){
    await p.locator('.ksSelect').nth(i).click();const key=getDesigns(type)[i].key;assert.equal(await p.locator('.ksPrintOnly svg').getAttribute('data-template-key'),key);
    const bounds=await p.locator('.ksGallery [data-text-role="name"]').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};}));for(const b of bounds)assert(b.x>=-1&&b.right<=1201&&b.y>=0&&b.bottom<=1800,'Name outside print');
    const filename=`${out}/${engine.name()}-${type}-${i}.jpg`;await download(p,filename);const bytes=await readFile(filename),info=await sharp(bytes).metadata();assert.equal(info.width,1200);assert.equal(info.height,1800);assert(bytes.length<2097152);hashes.push(digest(bytes));report.exports.push({browser:engine.name(),type,key,width:info.width,height:info.height,bytes:bytes.length,finish:'original'});
    if(engine===chromium){await p.emulateMedia({media:'print'});const pdf=`${out}/${type}-${i}-print.pdf`;await p.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});await p.emulateMedia({media:'screen'});report.pdfs.push(pdf);}
    // Exercise the actual adjustments and JPEG download path, not a detached rendering helper.
    for(const label of ['Soft','Black & white','Warm']){await p.getByRole('button',{name:/Photo adjustments/}).click();await p.getByRole('button',{name:label,exact:true}).click();await p.getByRole('button',{name:'Apply & return',exact:true}).click();const temp=`${out}/latest-finish.jpg`;await download(p,temp);const data=await readFile(temp),m=await sharp(data).metadata();assert.equal(m.width,1200);assert.equal(m.height,1800);assert(data.length<2097152);assert.notEqual(digest(data),digest(bytes),'Filter did not affect output');report.exports.push({browser:engine.name(),type,key,finish:label,width:m.width,height:m.height,bytes:data.length});}
    await p.getByRole('button',{name:/Photo adjustments/}).click();await p.getByRole('button',{name:'Original',exact:true}).click();await p.getByRole('button',{name:'Apply & return',exact:true}).click();await checkpoint();
   }
   assert.equal(new Set(hashes).size,3,'Three options produced the same output');
   const long='Alexandria Montgomery Christopher Wainwright';const detailNames={...fixture.details};for(const field of ['partner1','partner2','honoree','graduate','company','eventName'])if(field in detailNames)detailNames[field]=long;
   await recover(p,type,{...fixture,title:long,details:detailNames});
   const bounds=await p.locator('.ksGallery [data-text-role="name"]').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBBox();return {x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height,leftLimit:Number(n.getAttribute('data-safe-left')||0),rightLimit:Number(n.getAttribute('data-safe-right')||1200),topLimit:Number(n.getAttribute('data-safe-top')||0),bottomLimit:Number(n.getAttribute('data-safe-bottom')||1800)};}));for(const b of bounds){assert(b.x>=b.leftLimit-2&&b.right<=b.rightLimit+2);assert(b.y>=b.topLimit-2&&b.bottom<=b.bottomLimit+2,'Long name exceeded reserved area');}report.bounds.push({browser:engine.name(),type,bounds});
   assert.deepEqual(errors,[]);await checkpoint();
  }catch(error){report.failure={browser:engine.name(),type,error:error.message,errors};await p.screenshot({path:`${out}/${engine.name()}-${type}-FAIL.png`}).catch(()=>{});await checkpoint();throw error;}finally{await p.close();}
 }
 await browser.close();
}
report.completed=true;await checkpoint();console.log(JSON.stringify({jpegExports:report.exports.length,viewportChecks:report.viewportChecks.length,printPdfs:report.pdfs.length,productionMessagesSent:0}));
