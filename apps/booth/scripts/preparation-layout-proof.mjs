import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000',out='welcome-proof';await mkdir(out,{recursive:true});
const results=[];let page;
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});
 try{
  for(const [name,width,height] of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
   page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await page.getByLabel('Event title',{exact:true}).waitFor();
   const initial=await page.evaluate(()=>({tabs:document.querySelector('.epSteps').getBoundingClientRect().bottom,preview:document.querySelector('.epPreview').getBoundingClientRect().bottom,toolbar:document.querySelector('.epToolbar').getBoundingClientRect().top}));
   assert(initial.tabs<initial.toolbar,engine+' '+name+' editing steps visible immediately');
   if(width>900)assert(initial.preview<initial.toolbar,engine+' '+name+' full preview stays above toolbar');
   for(const tab of ['Details','Design','Event check','Backups']){
    await page.getByRole('tab',{name:tab,exact:true}).click();await page.waitForTimeout(150);
    const fields=await page.locator('.epFields input,.epFields select').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect(),label=e.closest('label').getBoundingClientRect();return {type:e.type,name:e.closest('label').textContent,left:r.left,right:r.right,width:r.width,labelLeft:label.left,labelRight:label.right};}));
    for(const field of fields){assert(field.left>=field.labelLeft-1&&field.right<=field.labelRight+1,engine+' '+name+' field stays inside label: '+field.name);assert(field.width>=80,engine+' '+name+' readable field width: '+field.name);}
    const geometry=await page.locator('.epPage').evaluate(e=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}));
    assert(geometry.scrollWidth<=geometry.clientWidth+1,JSON.stringify({engine,name,tab,geometry}));
    for(const selector of ['.epToolbarActions button','.epSteps button']){
     for(const control of await page.locator(selector).all()){
      await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();assert(box.height>=44);
      assert(box.x>=-1&&box.x+box.width<=width+1);
      const covered=await control.evaluate(e=>{const r=e.getBoundingClientRect();return !e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});assert(!covered,engine+' '+name+' '+tab+' control not covered');
     }
    }
    await page.locator('.epPage').evaluate(e=>e.scrollTo(0,0));
    await page.screenshot({path:`${out}/studio-${engine}-${name}-${tab.replaceAll(' ','-')}.png`,fullPage:true});
    results.push({engine,viewport:[width,height],test:name,tab,passed:true,fields});
   }
   await page.close();
  }
 }catch(error){if(page)await page.screenshot({path:`${out}/studio-layout-failure-${engine}.png`,fullPage:true}).catch(()=>{});await writeFile(`${out}/preparation-layout-results.json`,JSON.stringify({base,results,error:error.message},null,2));throw error;}finally{await browser.close();}
}
await writeFile(`${out}/preparation-layout-results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({preparationLayouts:results.length,failed:0,base}));
