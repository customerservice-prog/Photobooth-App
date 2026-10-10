import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {BOOTH_RELEASE} from '../app/lib/booth-launch.mjs';
import {validateBoothHandoff,configFromBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {workspace,octoberPreset,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {withReturnTo} from '../app/lib/staff-navigation.mjs';
const base=process.env.SETUP_NAVIGATION_URL||'http://127.0.0.1:3000';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Navigation fixtures are local only');
const origin=new URL(base).origin,out='setup-navigation-proof',results=[];
await mkdir(out,{recursive:true});
const payload=id=>validateBoothHandoff({v:1,id,rev:'2026-10-10T04:00:00.000Z',title:id==='navigation-one'?'Next Customer Event':'Current Customer Event',date:'2026-10-10',start:'16:00',end:'20:00',type:'wedding',f:'four',p:6,mode:'card',s:1,fit:'fill',a:'#32463e',b:'#d4ad73',limit:108,on:true,qr:true,design:'fpr-wedding',name:'Alex & Jordan',year:'',guest:'approved'});
const one=workspace('?booth_event=navigation-one'),other=workspace('?booth_event=navigation-other');
for(const [engine,api]of [['chromium',chromium],['webkit',webkit]]){
 const browser=await api.launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}: {})});
 const context=await browser.newContext({viewport:{width:1024,height:768},serviceWorkers:'block',reducedMotion:'reduce'});
 const errors=[],writes=[];let unlocked=false,current=payload(one.id);
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin!==origin)return route.abort();
  const reply=(status,json)=>route.fulfill({status,json});
  if(url.pathname==='/api/staff/unlock'){
   if(req.method()==='GET')return reply(200,{required:true,configured:true});
   assert.equal(req.method(),'POST');assert.equal(req.postDataJSON().pin,'4321');unlocked=true;return reply(200,{ok:true});
  }
  if(url.pathname==='/api/staff/lock'){unlocked=false;return reply(200,{ok:true});}
  if(url.pathname==='/api/staff/events')return unlocked?reply(200,{events:[one,other].map(s=>({id:s.id,title:payload(s.id).title,date:'2026-10-10'}))}):reply(401,{error:'Enter the staff PIN.'});
  if(url.pathname.startsWith('/api/staff/events/')){
   const id=url.pathname.split('/').at(-1);assert([one.id,other.id].includes(id));
   if(req.method()==='POST'){
    assert(unlocked);assert.equal(id,one.id);const data=req.postDataJSON();assert.equal(data.revision,current.rev);
    current=validateBoothHandoff({...current,design:data.design,rev:'2026-10-10T04:01:00.000Z'});writes.push({id,design:data.design});
   }
   const p=id===one.id?current:payload(id),token=Buffer.from(JSON.stringify({id})).toString('base64url')+'.'+'a'.repeat(43);
   return reply(200,{payload:p,token});
  }
  assert(['GET','HEAD'].includes(req.method()),'No unexpected real write '+url.pathname);
  return route.continue();
 });
 await context.addInitScript(({one,other,first,second,activeKey,eventKeys,october})=>{
  if(localStorage.getItem('navigation-seeded'))return;
  localStorage.setItem('navigation-seeded','true');localStorage.setItem(one.config,JSON.stringify(first));localStorage.setItem(other.config,JSON.stringify(second));
  localStorage.setItem(one.usage,'17');localStorage.setItem(other.usage,'29');localStorage.setItem(activeKey,other.id);
  localStorage.setItem(eventKeys.config,JSON.stringify(october));localStorage.setItem(eventKeys.demoUsage,'4');
  localStorage.setItem('friendly-booth-event-v1',JSON.stringify({...first,eventId:undefined,title:'Local rehearsal'}));
  window.print=()=>{throw Error('Navigation proof must not print');};
 },{one,other,first:configFromBoothHandoff(current),second:configFromBoothHandoff(payload(other.id)),activeKey:ACTIVE_EVENT_KEY,eventKeys:EVENT_KEYS,october:octoberPreset()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 const goto=path=>page.goto(base+path,{waitUntil:'networkidle'});
 const path=()=>new URL(page.url()).pathname+new URL(page.url()).search;
 const unlock=async()=>{await page.getByTestId('staff-start-pin').fill('4321');await page.getByTestId('staff-start-unlock').click();await page.getByTestId('staff-event-select').waitFor();};
 try{
  await goto('/launch');await page.getByTestId('launch-resume-current').waitFor();await page.waitForTimeout(250);assert.equal(path(),'/launch');
  assert.match(await page.locator('.blCurrent').innerText(),/Current Customer Event/);
  await page.getByTestId('launch-start-event').click();await page.getByTestId('staff-start-pin').waitFor();
  await page.getByTestId('staff-start-back').click();await page.getByTestId('launch-start-event').waitFor();assert.equal(path(),'/launch');
  await page.getByTestId('launch-resume-current').click();await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),other.home);
  await goto('/staff/start?event='+one.id);await unlock();assert.equal(await page.getByTestId('staff-event-select').inputValue(),one.id);
  for(const [w,h]of [[1024,768],[768,1024],[390,844],[320,640]]){
   await page.setViewportSize({width:w,height:h});const start=page.getByTestId('staff-start-event');await start.scrollIntoViewIfNeeded();
   assert(await start.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1&&r.height>=44&&e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));}),'Open guest welcome is reachable '+w+'x'+h);
   await page.screenshot({path:`${out}/${engine}-staff-${w}x${h}.png`});
  }
  await page.setViewportSize({width:1024,height:768});await page.getByTestId('staff-layout-fpr-birthday').click();await page.getByTestId('staff-start-event').click();
  await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),one.home);
  await page.waitForFunction(()=>document.querySelector('[data-testid="welcome-large-proof"] svg')?.getAttribute('data-fpr-preset')==='birthday'&&!document.querySelector('[data-testid="welcome-start-session"]')?.disabled);
  assert.equal(await page.getByTestId('welcome-large-proof').locator('svg').getAttribute('data-fpr-preset'),'birthday');
  const state=await page.evaluate(({one,other,active})=>({one:JSON.parse(localStorage.getItem(one.config)).defaultTemplate,oneCount:localStorage.getItem(one.usage),otherCount:localStorage.getItem(other.usage),active:localStorage.getItem(active)}),{one,other,active:ACTIVE_EVENT_KEY});
  assert.deepEqual(state,{one:'fpr-birthday',oneCount:'17',otherCount:'29',active:one.id});
  await page.getByTestId('welcome-staff-tools').click();await page.locator('#bwStaffPin').fill('4321');await page.getByTestId('staff-confirm').click();
  const printer=page.getByRole('link',{name:/Canon wireless printing/});const printerHref=await printer.getAttribute('href');assert.equal(new URL(printerHref,base).searchParams.get('returnTo'),one.home);
  await printer.click();await page.getByTestId('staff-page-back').waitFor();assert.equal(new URL(page.url()).searchParams.get('returnTo'),one.home);
  await page.getByTestId('staff-page-back').click();await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),one.home);
  await goto(withReturnTo('/help','/?event=oct10-2026&demo=1'));await page.getByRole('link',{name:'Photo privacy',exact:true}).click();await page.waitForLoadState('networkidle');await page.getByTestId('staff-page-back').waitFor();
  assert.equal(new URL(await page.getByTestId('staff-page-back').getAttribute('href'),base).pathname,'/help');
  await page.getByTestId('staff-page-back').click();await page.waitForLoadState('networkidle');await page.getByTestId('staff-page-back').click();await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),'/?event=oct10-2026&demo=1');
  await goto('/?local=1');await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),'/?local=1');assert.match(await page.locator('#bwEventTitle').innerText(),/Local rehearsal/);
  await page.getByRole('link',{name:'Help',exact:true}).click();await page.getByTestId('staff-page-back').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('returnTo'),'/?local=1','welcome Help retains the local event even with another active customer event');
  await page.getByTestId('staff-page-back').click();await page.getByTestId('welcome-start-session').waitFor();assert.equal(path(),'/?local=1');
  await goto('/handoff');await page.getByRole('link',{name:'Choose event & design',exact:true}).waitFor();assert.equal(await page.getByTestId('staff-page-back').count(),1);
  assert.deepEqual(writes,[{id:one.id,design:'fpr-birthday'}]);assert.deepEqual(errors,[]);
  results.push({engine,passed:true,release:BOOTH_RELEASE,staffSizes:4,checks:['stable start','explicit resume','PIN cancel','event selection','reachable start','selected layout launch','event-safe printer back','help/privacy/demo back','local rehearsal isolation','handoff recovery'],writes});
 }catch(e){results.push({engine,passed:false,message:e.message,stack:e.stack});await page.screenshot({path:`${out}/${engine}-failure.png`,fullPage:true}).catch(()=>{});process.exitCode=1;}
 await context.close();await browser.close();
}
await writeFile(`${out}/results.json`,JSON.stringify({results},null,2));console.log(JSON.stringify(results.map(r=>({engine:r.engine,passed:r.passed,message:r.message})),null,2));
