import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const base=process.env.WELCOME_BASE_URL||'http://127.0.0.1:3000',out='welcome-proof';await mkdir(out,{recursive:true});
const results=[];
for(const [engine,api] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true});
 try{const page=await browser.newPage();
 for(const [name,width,height] of [['desktop',1366,768],['ipad-landscape',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
  await page.setViewportSize({width,height});await page.goto(base+'/event-prep',{waitUntil:'networkidle'});await page.getByLabel('Event title',{exact:true}).waitFor();
  await page.locator('.epPage').evaluate(e=>e.scrollTo(0,0));
  const fields=await page.locator('.epFields input:not([type=checkbox]),.epFields select').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect(),label=e.closest('label').getBoundingClientRect();return {type:e.type,name:e.closest('label').textContent,left:r.left,right:r.right,width:r.width,labelLeft:label.left,labelRight:label.right};}));
  for(const field of fields){assert(field.left>=field.labelLeft-1&&field.right<=field.labelRight+1,engine+' '+name+' field stays inside label: '+field.name);assert(field.width>=80,engine+' '+name+' readable field width: '+field.name);}
  assert(await page.locator('.epPage').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await page.screenshot({path:`${out}/prep-top-${engine}-${name}.png`,fullPage:true});
  await page.getByLabel('Starting keepsake',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/prep-fields-${engine}-${name}.png`,fullPage:true});
  results.push({engine,viewport:[width,height],test:name,passed:true,fields});
 }
 }finally{await browser.close();}
}
await writeFile(`${out}/preparation-layout-results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({preparationLayouts:results.length,failed:0,base}));
