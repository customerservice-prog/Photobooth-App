import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.BOOTH_BASE_URL||'http://127.0.0.1:3000';
const output='handoff-proof';await mkdir(output,{recursive:true});
const fixture={v:1,i:'efcbaffc-893f-4361-983b-79a38e7d111a',t:'October 10 Photo Booth Party',d:'2026-10-10',o:'Party',f:1,b:9,l:'strip',s:2,x:'fill',c:['#855665','#e4b4a1'],g:'blush',n:216,p:true,q:true};
const token=Buffer.from(JSON.stringify(fixture)).toString('base64url');
for(let tries=0;tries<70;tries++){try{if((await fetch(base+'/load-event')).ok)break;}catch{}if(tries===69)throw Error('Booth did not start.');await new Promise(resolve=>setTimeout(resolve,1000));}
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
 const context=await browser.newContext({viewport:{width:1024,height:768}});
 await context.addInitScript(()=>{
  if(localStorage.getItem('friendly-booth-event-v1')===null)localStorage.setItem('friendly-booth-event-v1','{"title":"My original event"}');
  if(localStorage.getItem('friendly-booth-print-usage-v1')===null)localStorage.setItem('friendly-booth-print-usage-v1','39');
  if(localStorage.getItem('friendly-booth-photos-v1')===null)localStorage.setItem('friendly-booth-photos-v1','["saved-original"]');
  if(localStorage.getItem('friendly-booth-oct10-2026-v2-live-usage')===null)localStorage.setItem('friendly-booth-oct10-2026-v2-live-usage','87');
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.goto(base+'/load-event#'+token,{waitUntil:'networkidle'});
  await page.getByTestId('handoff-review').waitFor();
  assert.equal(await page.locator('.loadReviewHead h2').innerText(),fixture.t);
  assert((await page.locator('.loadFacts').innerText()).includes('Two matching photo strips'));
  assert.equal(new URL(page.url()).hash,'','import code removed from visible URL');
  await page.screenshot({path:`${output}/${engine}-review.png`,fullPage:true});
  await page.getByTestId('confirm-handoff').click();
  await page.getByTestId('handoff-loaded').waitFor();
  const counters=await page.evaluate(()=>({
   old:localStorage.getItem('friendly-booth-print-usage-v1'),
   october:localStorage.getItem('friendly-booth-oct10-2026-v2-live-usage'),
   photos:localStorage.getItem('friendly-booth-photos-v1'),
   original:localStorage.getItem('friendly-booth-event-v1')
  }));
  assert.deepEqual(counters,{old:'39',october:'87',photos:'["saved-original"]',original:'{"title":"My original event"}'});
  await page.getByTestId('open-loaded-event').click();
  await page.waitForURL(/event=admin-/);
  await page.locator('#bwEventTitle').waitFor();
  await page.waitForFunction(()=>document.querySelector('#bwEventTitle')?.textContent==='October 10 Photo Booth Party');
  assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);
  assert.equal(await page.getByTestId('welcome-four-photo').count(),1);
  assert(await page.getByTestId('welcome-quick-photo').getAttribute('class').then(c=>c.includes('isPreferred')));
  const inBooth=await page.evaluate(()=>{
   const key='friendly-booth-import:admin-efcbaffc-893f-4361-983b-79a38e7d111a:';
   return {used:localStorage.getItem('friendly-booth-oct10-2026-v2-live-usage'),cfg:JSON.parse(localStorage.getItem(key+'config'))};
  });
  assert.equal(inBooth.used,'87','existing October counter must carry into transferred booth');
  assert.equal(inBooth.cfg.printPackage.includedPrints,216);
  assert.equal(inBooth.cfg.photoPauseSeconds,9);
  assert.equal(inBooth.cfg.printLayouts.stripMode,'double');
  assert.equal(inBooth.cfg.defaultTemplate,'blush');
  assert.equal(inBooth.cfg.details.primaryColor,'#855665');
  await page.screenshot({path:`${output}/${engine}-loaded-event.png`,fullPage:true});
  // Same event can receive a fresh settings file without resetting prints.
  await page.evaluate(()=>localStorage.setItem('friendly-booth-oct10-2026-v2-live-usage','12'));
  await page.goto(base+'/load-event',{waitUntil:'networkidle'});
  const updated={...fixture,f:4,b:12,n:300,s:1,l:'card'};
  await page.getByTestId('handoff-file').setInputFiles({name:'friendly-event.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(updated))});
  await page.getByTestId('handoff-review').waitFor();
  assert((await page.locator('.loadNotice').innerText()).includes('12 print requests'));
  await page.getByTestId('confirm-handoff').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('friendly-booth-oct10-2026-v2-live-usage')),'12');
  await page.getByTestId('open-loaded-event').click();
  await page.locator('#bwEventTitle').waitFor();
  assert((await page.getByTestId('welcome-four-photo').getAttribute('class')).includes('isPreferred'));
  for(const [label,width,height] of [['ipad',1024,768],['phone',390,844]]){
   await page.setViewportSize({width,height});
   await page.goto(base+'/load-event#'+token,{waitUntil:'domcontentloaded'});
   await page.getByTestId('handoff-review').waitFor();
   const widths=await page.evaluate(()=>({html:document.documentElement.scrollWidth,screen:innerWidth}));
   assert(widths.html<=widths.screen+2,label+' layout has no horizontal overflow');
   await page.screenshot({path:`${output}/${engine}-${label}-import.png`,fullPage:true});
  }
  assert.equal(errors.length,0,'no browser exceptions: '+errors.join(' | '));
  console.log(engine+': admin handoff import, update, photo/counter preservation, mobile layouts PASS');
 }finally{await context.close();await browser.close();}
}
