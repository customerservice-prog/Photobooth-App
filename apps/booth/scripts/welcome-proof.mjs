import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000';
const out='welcome-proof';await mkdir(out,{recursive:true});
const cfg={title:'October 10 Photo Booth Party',subtitle:'Your Photo Booth Preview',date:'October 10, 2026',type:'other',setupComplete:true,defaultTemplate:'champagne',photoFit:'fit',details:{eventName:'October 10 Photo Booth Party',subtitle:'4–8 PM',primaryColor:'#24352f',secondaryColor:'#d8c49b'},printPackage:{includedPrints:108,addOnPrints:108,shotsPerSession:4,copiesPerSession:1,digitalEnabled:true,printingEnabled:true}};
const results=[];
for(let n=0;n<60;n++){try{const r=await fetch(base);if(r.ok)break;}catch{}if(n===59)throw new Error('Server did not become ready');await new Promise(r=>setTimeout(r,1000));}
async function setup(context){await context.addInitScript(config=>{
  if(!localStorage.getItem('friendly-booth-event-v1'))localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config));
  if(!localStorage.getItem('friendly-booth-print-usage-v1'))localStorage.setItem('friendly-booth-print-usage-v1','7');
  // Test-only replacement: never send an actual print job or customer message.
  window.print=()=>{window.__proofPrintCalls=(window.__proofPrintCalls||0)+1;window.dispatchEvent(new Event('afterprint'));};
},cfg);}
async function open(page){await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('[data-welcome-version="premium-2026-10-06"]');await page.waitForFunction(()=>document.querySelector('#bwEventTitle')?.textContent==='October 10 Photo Booth Party');await page.waitForTimeout(400);}
async function layout(page,name,w,h){
  await page.setViewportSize({width:w,height:h});await open(page);
  assert.equal(await page.locator('h1').count(),1,'One event heading');
  const data=await page.evaluate(()=>{
    const root=document.querySelector('.bwWelcome'),footer=document.querySelector('.bwFooter').getBoundingClientRect();
    return {clientWidth:root.clientWidth,scrollWidth:root.scrollWidth,innerHeight:innerHeight,clientHeight:root.clientHeight,scrollHeight:root.scrollHeight,footerTop:footer.top,buttons:[...document.querySelectorAll('.bwPhotoButton,.bwExtra')].map(b=>{const r=b.getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,Math.min(r.top+r.height/2,innerHeight-1));return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,covered:r.bottom<=innerHeight&&!b.contains(top)};})};
  });
  assert(data.scrollWidth<=data.clientWidth+1,name+' must not overflow horizontally');
  for(const b of data.buttons){assert(b.left>=-1&&b.right<=w+1,name+' button in horizontal viewport');assert(b.height>=44,name+' touch target');assert(!b.covered,name+' button not covered');assert(data.footerTop>=b.bottom-1,name+' footer not overlapping controls');if(w>=768&&h>=600)assert(b.top>=0&&b.bottom<=h,name+' primary controls above fold');}
  assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7','Welcome must not reset usage');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('friendly-booth-event-v1')).printPackage.addOnPrints),108);
  await page.screenshot({path:`${out}/${name}.png`,fullPage:true});
  results.push({test:name,passed:true,viewport:[w,h],layout:data});
}
let browser;
try{
  for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
    browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}: {})});
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',...(engine==='chromium'?{permissions:['camera']}: {})});await setup(context);
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const [label,w,h] of [['desktop',1440,900],['laptop',1366,650],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640],['short-screen',1024,600],['zoom-reflow',640,720]])await layout(page,`${engine}-${label}`,w,h);
    await page.setViewportSize({width:1366,height:768});await open(page);
    await page.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});assert((await page.locator('.bwConnection').textContent()).includes('Offline'));results.push({test:engine+'-offline-indicator',passed:true});
    await open(page);await page.getByRole('button',{name:'Add to iPad',exact:true}).click();await page.getByRole('dialog',{name:'Install on iPad'}).waitFor();await page.getByRole('button',{name:'Close instructions'}).click();results.push({test:engine+'-install-dialog',passed:true});
    const staff=page.getByRole('button',{name:'Operator controls (tap five times)',exact:true});for(let i=0;i<5;i++)await staff.click();await page.getByRole('dialog',{name:'Operator controls',exact:true}).waitFor();assert((await page.locator('.operatorPanel').textContent()).includes('209'));await page.getByRole('button',{name:'Close controls',exact:true}).click();results.push({test:engine+'-operator-and-remaining-allowance',passed:true});
    await page.getByRole('link',{name:'Event setup',exact:true}).click();await page.waitForURL('**/setup');assert(await page.locator('input').count()>0||await page.locator('button').count()>0);await open(page);
    await page.getByRole('link',{name:'Help',exact:true}).click();await page.waitForURL('**/help');results.push({test:engine+'-setup-and-help-navigation',passed:true});
    await open(page);await page.evaluate(()=>{const c=JSON.parse(localStorage.getItem('friendly-booth-event-v1'));c.title='A Very Long Family Celebration With Everyone We Love And A Wonderfully Long Event Name';c.details.eventName=c.title;localStorage.setItem('friendly-booth-event-v1',JSON.stringify(c));});await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(250);const overflow=await page.evaluate(()=>{const r=document.querySelector('.bwWelcome');return r.scrollWidth>r.clientWidth+1;});assert(!overflow);await page.screenshot({path:`${out}/${engine}-long-title.png`,fullPage:true});results.push({test:engine+'-long-event-name',passed:true});
    await page.evaluate(config=>localStorage.setItem('friendly-booth-event-v1',JSON.stringify(config)),cfg);await open(page);
    if(engine==='chromium'){
      await page.getByTestId('welcome-photo').click();await page.locator('.ksStudio').waitFor({timeout:30000});await page.getByRole('button',{name:'Digital Copy',exact:true}).waitFor({timeout:30000});
      assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');
      await page.getByRole('button',{name:'Digital Copy',exact:true}).click();await page.getByRole('dialog',{name:'Get a digital copy.',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'7');await page.keyboard.press('Escape');
      await page.getByRole('button',{name:'Print 1 Copy',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-print-usage-v1')),'8');assert.equal(await page.evaluate(()=>window.__proofPrintCalls),1);assert(await page.getByRole('button',{name:'Printed 1 Copy',exact:true}).isDisabled());
      await page.screenshot({path:`${out}/chromium-photo-preview.png`,fullPage:true});results.push({test:'chromium-simulated-camera-digital-and-one-print-request',passed:true,physicalPrinterUsed:false});
      for(const [id,target] of [['welcome-video','Your video is ready.'],['welcome-gif','Your GIF is ready.']]){await open(page);await page.getByTestId(id).click();await page.getByRole('heading',{name:target,exact:true}).waitFor({timeout:30000});results.push({test:'chromium-'+id+'-simulated-capture',passed:true});}
      await open(page);await page.evaluate(()=>localStorage.setItem('friendly-booth-print-usage-v1','216'));await open(page);assert((await page.locator('.bwChoiceNote').textContent()).includes('Digital photos'));results.push({test:'print-exhaustion-keeps-digital-available',passed:true});
    }
    assert.deepEqual(errors,[],engine+' no uncaught browser errors');results.push({test:engine+'-no-browser-errors',passed:true});await browser.close();browser=null;
  }
}catch(error){results.push({test:'failure',passed:false,message:error.message,stack:error.stack});if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0])await pages[0].screenshot({path:`${out}/failure.png`,fullPage:true}).catch(()=>{});await browser.close();}await writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.error(error);process.exitCode=1;}
await writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,base},null,2));
