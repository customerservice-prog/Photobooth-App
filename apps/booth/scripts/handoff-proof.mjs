import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {buildBoothHandoffPayload} from '../../admin/lib/booth-transfer.mjs';
const base=process.env.BOOTH_PROOF_URL||'http://127.0.0.1:3000';
const event={id:'11111111-aaaa-4444-bbbb-888888888888',name:'Test Wedding Celebration',
 eventType:'wedding',date:new Date('2026-10-10T12:00:00.000Z'),
 startTime:new Date('2026-10-10T20:00:00.000Z'),endTime:new Date('2026-10-11T00:00:00.000Z'),
 updatedAt:new Date('2026-10-08T05:00:00.000Z'),
 maxPrints:216,printingEnabled:true,qrSharingEnabled:true,
 theme:{boothExperience:{featured:'one',pauseSeconds:12,format:'strip',strips:2,photoFit:'fill',primary:'#855665',accent:'#e4b4a1'}}};
function href(payload){return base+'/handoff#'+Buffer.from(JSON.stringify(payload),'utf8').toString('base64url');}
const payload=buildBoothHandoffPayload(event),errors=[];
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true,args:engine===chromium?['--no-sandbox']:[]});
 const context=await browser.newContext({viewport:{width:1024,height:768}});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/');
  await page.evaluate(()=>{
   localStorage.setItem('friendly-booth-event-v1',JSON.stringify({title:'Existing local event'}));
   localStorage.setItem('friendly-booth-print-usage-v1','27');
   localStorage.setItem('friendly-booth-oct10-2026-v2-live-usage','31');
   localStorage.setItem('friendly-booth-oct10-2026-v2-demo-usage','7');
  });
  // The installed PWA can import within its own storage even if a QR opens
  // in a separate Safari browser container.
  await page.getByTestId('welcome-staff-tools').click();
  await page.getByTestId('staff-confirm').click();
  await page.getByTestId('staff-load-event').locator('summary').click();
  await page.getByTestId('staff-event-link').fill(href(payload));
  await page.getByTestId('staff-review-event').click();
  await page.waitForURL(u=>u.pathname==='/handoff'&&Boolean(u.hash),{timeout:15000});
  await page.getByTestId('booth-handoff-review').waitFor();
  assert((await page.getByTestId('booth-handoff-review').innerText()).includes('Test Wedding Celebration'));
  assert((await page.getByTestId('booth-handoff-review').innerText()).includes('216 sheets'));
  await page.getByTestId('booth-handoff-apply').click();
  await page.waitForURL('**/?booth_event='+payload.id,{timeout:20000});
  await page.getByTestId('welcome-four-photo').waitFor({timeout:20000});
  assert.equal(await page.getByTestId('welcome-quick-photo').count(),1);
  const data=await page.evaluate(id=>{
   const root='friendly-booth-transfer-v1-'+id;
   return {
    c:JSON.parse(localStorage.getItem(root+'-config')),used:localStorage.getItem(root+'-usage'),
    original:JSON.parse(localStorage.getItem('friendly-booth-event-v1')),
    legacy:localStorage.getItem('friendly-booth-print-usage-v1'),
    octoberLive:localStorage.getItem('friendly-booth-oct10-2026-v2-live-usage'),
    octoberDemo:localStorage.getItem('friendly-booth-oct10-2026-v2-demo-usage')
   };
  },payload.id);
  assert.equal(data.c.title,'Test Wedding Celebration');
  assert.equal(data.c.defaultPhotoExperience,'one');
  assert.equal(data.c.photoPauseSeconds,12);
  assert.equal(data.c.printLayouts.stripMode,'double');
  assert.equal(data.c.printPackage.includedPrints,216);
  assert.equal(data.used,'0');
  assert.equal(data.original.title,'Existing local event');
  assert.equal(data.legacy,'27');
  assert.equal(data.octoberLive,'31');
  assert.equal(data.octoberDemo,'7');
  await page.goto(base+'/setup?booth_event='+payload.id,{waitUntil:'networkidle'});
  await page.getByTestId('premium-event-setup').waitFor({timeout:20000});
  // Do not save a photo setup here; the event was already transferred.
  await page.goto(base+'/?booth_event='+payload.id);
  await page.evaluate(id=>localStorage.setItem('friendly-booth-transfer-v1-'+id+'-usage','18'),payload.id);
  const updated={...payload,rev:'2026-10-08T06:00:00.000Z',mode:'card',s:1,limit:108};
  await page.goto(href(updated));
  await page.getByTestId('booth-handoff-review').waitFor();
  assert((await page.getByTestId('booth-handoff-review').innerText()).includes('18 previous print requests'));
  await page.getByTestId('booth-handoff-apply').click();
  await page.waitForURL('**/?booth_event='+payload.id);
  const usage=await page.evaluate(id=>localStorage.getItem('friendly-booth-transfer-v1-'+id+'-usage'),payload.id);
  assert.equal(usage,'18','reimport never resets print usage');
  const preserved=await page.evaluate(id=>Boolean(localStorage.getItem('friendly-booth-transfer-v1-'+id+'-previous')),payload.id);
  assert(preserved,'prior event config is backed up');
  await page.setViewportSize({width:390,height:844});
  await page.goto(href(updated));
  const button=page.getByTestId('booth-handoff-apply');
  const b=await button.boundingBox();
  assert(b&&b.height>=44&&b.width>250,'hand-off controls remain easy to tap on iPad or phone');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  assert(overflow<=2,'no horizontal overflow on mobile handoff');
  const handoffErrors=errors.filter(error=>!/api\/app-version\?check=.*due to access control checks/.test(error));
  assert.equal(handoffErrors.length,0,'no handoff page errors: '+handoffErrors.join(' | '));
  console.log(engine.name()+': event imported, updated without changing photos/counters, mobile review passed.');
 }finally{await context.close();await browser.close();}
}
