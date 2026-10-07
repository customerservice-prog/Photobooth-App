import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000',out='welcome-proof';await mkdir(out,{recursive:true});
const results=[];let failed=false;
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});
 try{
 for(const [name,width,height] of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  let fields=[],layout={};
  try{
   await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await page.getByLabel('Event title',{exact:true}).waitFor();
   await page.evaluate(async()=>{await document.fonts.ready;document.querySelector('.epPage').scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.waitForTimeout(300);
   fields=await page.locator('.epFields input:not([type=checkbox]),.epFields select').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect(),label=e.closest('label').getBoundingClientRect(),s=getComputedStyle(e);return {type:e.type,name:e.closest('label').textContent,left:r.left,right:r.right,width:r.width,labelLeft:label.left,labelRight:label.right,cssWidth:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,appearance:s.appearance};}));
   layout=await page.evaluate(()=>({innerWidth,outerWidth,visualWidth:visualViewport?.width,grid:getComputedStyle(document.querySelector('.epGrid')).gridTemplateColumns,fields:getComputedStyle(document.querySelector('.epFields')).gridTemplateColumns,narrow:matchMedia('(max-width:900px)').matches,scrollWidth:document.querySelector('.epPage').scrollWidth,clientWidth:document.querySelector('.epPage').clientWidth}));
   await page.screenshot({path:`${out}/prep-top-${engine}-${name}.png`,fullPage:true});
   await page.locator('.epFields select').first().scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/prep-fields-${engine}-${name}.png`,fullPage:true});
   for(const f of fields){assert(f.left>=f.labelLeft-1&&f.right<=f.labelRight+1,engine+' '+name+' field stays inside label: '+JSON.stringify({field:f,layout}));assert(f.width>=80,engine+' '+name+' readable field width: '+JSON.stringify(f));}
   assert(layout.scrollWidth<=layout.clientWidth+1,engine+' '+name+' horizontal overflow');
   results.push({engine,viewport:[width,height],test:name,passed:true,fields,layout});
  }catch(e){failed=true;results.push({engine,viewport:[width,height],test:name,passed:false,fields,layout,error:e.message});console.error(e.message);}
  finally{await context.close();await writeFile(`${out}/preparation-layout-results.json`,JSON.stringify({base,results},null,2));}
 }
 }finally{await browser.close();}
}
console.log(JSON.stringify({preparationLayouts:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,base}));if(failed)process.exitCode=1;
