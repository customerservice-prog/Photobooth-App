import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PrismaClient} from '@prisma/client';
const base=process.env.ADMIN_PROOF_URL||'http://localhost:3001';
const readonly=process.env.ADMIN_PROOF_READONLY==='1';
const local=value=>['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname);
assert(local(base),'This editing proof is limited to the local test server');
if(!readonly)assert(process.env.DATABASE_URL&&local(process.env.DATABASE_URL),'Use only the disposable local PostgreSQL fixture database');
assert(process.env.ADMIN_PROOF_PASSWORD,'A generated test login is required');
await mkdir('admin-proof',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const prisma=readonly?null:new PrismaClient(),results=[];
const pass=test=>results.push({test,passed:true});
let page;
async function ownerHome(){
 await page.goto(base+'/dashboard',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Your event workspace.',exact:true}).waitFor();
 assert(await page.getByTestId('owner-current-event').isVisible());
 const flow=page.getByTestId('owner-workflow');assert.equal(await flow.locator('article').count(),3);
 for(const name of ['Prepare the event','Load the iPad','Save the photos'])assert(await flow.getByRole('heading',{name,exact:true}).isVisible());
 for(const [name,path]of [['Edit event & design →','/edit'],['Get iPad setup link →','#send-to-booth'],['Gallery & finish event →','#after-event']])assert.equal(await flow.getByRole('link',{name,exact:true}).getAttribute('href'),'/events/event-smoke-20261010'+path);
 const nav=page.getByRole('navigation',{name:'Admin navigation'});assert.equal(await nav.locator('.navGroup .navLink').count(),3);
 assert.equal(await nav.getByRole('link',{name:'Digital galleries',exact:true}).getAttribute('href'),'/galleries');
 assert.equal(await nav.locator('.ownerMoreTools').getAttribute('open'),null);
 pass('owner-home-three-stages-and-three-primary-links');
}
async function preview(design,name,year=''){
 await page.waitForFunction(({design,name,year})=>{const nodes=[...document.querySelectorAll('[data-testid="owner-design-proof"] svg')];return nodes.length===2&&nodes.every(svg=>svg.getAttribute('data-design')?.endsWith('-'+design)&&svg.textContent.includes(name)&&(!year||svg.textContent.includes(year)));},{design,name,year});
 for(const n of [1,4]){assert.equal(await page.getByTestId('owner-proof-'+n).locator('svg').count(),1);assert.equal(await page.getByTestId('owner-proof-'+n).locator('[data-guest-photo="true"]').count(),0);}
}
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 if(readonly)await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());if(url.origin!==new URL(base).origin||!['GET','HEAD'].includes(request.method())&&url.pathname!=='/api/auth/login')return route.abort();return route.continue();});
 page=await context.newPage();
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/login');
 await page.getByRole('heading',{name:'Staff sign in'}).waitFor();
 await page.locator('input[name="password"]').fill(process.env.ADMIN_PROOF_PASSWORD||'');
 await page.getByRole('button',{name:/Sign in/}).click();
 await page.waitForURL('**/dashboard');
 await ownerHome();
 await page.goto(base+'/events/event-smoke-20261010',{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'October 10 Test Photo Booth Party'}).waitFor();
 assert.equal(await page.getByTestId('owner-event-readiness').innerText(),'Needs setup','a missing venue must not appear ready');
 assert(await page.getByText('Venue and address').first().isVisible());
 assert.equal(await page.getByTestId('owner-event-workflow').locator('section').count(),3);
 assert.equal(await page.getByTestId('owner-event-gallery').getAttribute('href'),'/events/event-smoke-20261010/backups');
 await page.screenshot({path:'admin-proof/event-before-desktop.png',fullPage:true});
 await page.getByRole('link',{name:/Edit event/}).first().click();
 await page.getByRole('heading',{name:'Details and approved design',exact:true}).waitFor();
 const original={format:await page.locator('input[name="format"]').inputValue(),strips:await page.locator('input[name="strips"]').inputValue(),booth:await page.locator('select[name="boothId"]').inputValue(),template:await page.locator('select[name="templateId"]').inputValue()};
 assert.equal(await page.locator('details#experience').getAttribute('open'),null);assert.equal(await page.getByTestId('owner-event-advanced').getAttribute('open'),null);
 await page.locator('input[name="nameOnPrint"]').fill('Test Celebration');await preview('champagne','Test Celebration');
 await page.locator('input[name="date"]').fill('2026-10-12');await page.waitForFunction(()=>[...document.querySelectorAll('[data-testid="owner-design-proof"] svg')].every(svg=>svg.textContent.includes('October 12, 2026')));await page.locator('input[name="date"]').fill('2026-10-10');
 await page.locator('select[name="eventType"]').selectOption('Graduation');await page.locator('label.ownerDesignChoice').filter({has:page.locator('input[value="grad-gala"]')}).click();await page.locator('input[name="classYear"]').fill('2027');await preview('grad-gala','Test Celebration','2027');
 await page.locator('input[name="classYear"]').fill('');await page.locator('select[name="eventType"]').selectOption('Party');await page.locator('label.ownerDesignChoice').filter({has:page.locator('input[value="champagne"]')}).click();await preview('champagne','Test Celebration');
 const formData=await page.locator('form.ownerEventForm').evaluate(form=>Object.fromEntries(new FormData(form)));for(const [field,key]of [['format','format'],['strips','strips'],['boothId','booth'],['templateId','template']])assert.equal(formData[field],original[key]);
 pass('live-name-date-year-matching-one-four-proofs-and-closed-legacy-fields');
 await page.getByTestId('owner-event-advanced').locator('summary').click();
 await page.locator('input[name="venueName"]').fill('Sky Lodge');
 await page.locator('input[name="venueAddress"]').fill('123 Main Street, Syracuse, NY');
 await page.locator('input[name="maxPrints"]').fill('0');
 await page.locator('details#experience summary').click();await page.locator('select[name="featured"]').selectOption('one');
 await page.locator('select[name="pauseSeconds"]').selectOption('9');
 await page.locator('input[name="nameOnPrint"]').fill('Test Celebration');
 assert.equal(await page.locator('input[name="strips"]').inputValue(),'1');
 await page.locator('input[name="paletteId"][value="rose"]').check();
 await page.screenshot({path:'admin-proof/edit-desktop.png',fullPage:true});
 if(!readonly){await page.getByRole('button',{name:/Save event changes/}).click();
 await page.waitForURL('**/events/event-smoke-20261010');
 assert.equal(await page.getByTestId('owner-event-readiness').innerText(),'Event details saved');
 }else await page.goto(base+'/events/event-smoke-20261010',{waitUntil:'networkidle'});
 await page.getByTestId('send-to-booth').click();
 await page.getByRole('dialog',{name:'Load event on iPad'}).waitFor();
 const transferUrl=await page.getByTestId('event-handoff-url').inputValue();
 assert(transferUrl.startsWith('https://photobooth-booth-production.up.railway.app/handoff#'));
 const shareData=JSON.parse(Buffer.from(transferUrl.split('#')[1],'base64url').toString('utf8'));
 assert.equal(shareData.title,'October 10 Test Photo Booth Party');
 if(!readonly){assert.equal(shareData.limit,0);
 assert.equal(shareData.f,'one');
 assert.equal(shareData.p,9);
 assert.equal(shareData.s,Number(original.strips));assert.equal(shareData.design,'champagne');assert.equal(shareData.name,'Test Celebration');}assert.equal(shareData.guest,'approved');
 assert(!JSON.stringify(shareData).includes('test@example.invalid'));
 await page.getByTestId('event-handoff-qr').waitFor({timeout:15000});
 await page.screenshot({path:'admin-proof/send-to-booth-qr.png'});
 await page.getByRole('button',{name:'Close transfer'}).click();
 assert.equal(await page.getByRole('dialog',{name:'Load event on iPad'}).count(),0);
 console.log('Send to Booth QR and transfer payload verified without customer contact data.');
 await page.screenshot({path:'admin-proof/event-after-desktop.png',fullPage:true});
 if(!readonly){const event=await prisma.event.findUnique({where:{id:'event-smoke-20261010'},include:{customer:true,booth:true,template:true}});
 assert.equal(event.venueName,'Sky Lodge');
 assert.equal(event.venueAddress,'123 Main Street, Syracuse, NY');
 assert.equal(event.maxPrints,0);
 assert.equal(event.theme.legacySetting,'must survive');
 assert.equal(event.theme.boothExperience.featured,'one');
 assert.equal(event.theme.boothExperience.pauseSeconds,9);
 assert.equal(event.theme.boothExperience.format,original.format);
 assert.equal(String(event.theme.boothExperience.strips),original.strips);assert.equal(event.theme.boothExperience.approvedDesign,'champagne');assert.equal(event.theme.boothExperience.nameOnPrint,'Test Celebration');
 assert.equal(event.boothId,original.booth);assert.equal(event.templateId,original.template);assert.equal(event.customer.email,'test@example.invalid');
 assert.equal(event.theme.boothExperience.primary,'#855665');
 assert.equal(event.theme.boothExperience.accent,'#e4b4a1');
 assert.equal(event.endTime.toISOString(),'2026-10-11T00:00:00.000Z');
 assert.equal(event.status,'CONFIGURED');
 console.log('Event settings saved, midnight schedule and unrelated theme metadata retained.');
 pass('real-postgres-save-preserves-references-contact-custom-theme-and-midnight-schedule');}
 await page.goto(base+'/galleries',{waitUntil:'networkidle'});await page.getByRole('heading',{name:'Your digital galleries',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Open private gallery →',exact:true}).first().getAttribute('href'),'/events/event-smoke-20261010/backups');pass('digital-galleries-open-actual-private-event-backups');
 for(const path of ['/dashboard','/events','/booths','/templates','/photos','/galleries','/customers','/employees','/reports','/settings']){
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  const top=page.locator('main.page');
  await top.waitFor();
  assert(await top.getByRole('heading',{level:1}).count()===1,'one clear primary heading at '+path);
  assert(!errors.length,'no page script errors at '+path+': '+errors.join(' | '));
 }
 for(const [label,width,height] of [['desktop',1440,900],['ipad',1024,768],['ipad-portrait',768,1024],['phone',390,844],['small-phone',320,640]]){
  await page.setViewportSize({width,height});
  for(const [kind,path]of [['home','/dashboard'],['edit','/events/event-smoke-20261010/edit'],['new','/events/new'],['galleries','/galleries']]){
   await page.goto(base+path,{waitUntil:'networkidle'});await page.locator('main.page').waitFor();assert.equal(await page.locator('main.page h1').count(),1);const fit=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,windowWidth:innerWidth}));assert(fit.documentWidth<=fit.windowWidth+2,label+' '+kind+' horizontal fit '+JSON.stringify(fit));
   if(kind==='edit'){assert.equal(await page.getByTestId('owner-design-proof').locator('svg').count(),2);assert.equal(await page.locator('details#experience').getAttribute('open'),null);assert.equal(await page.getByTestId('owner-event-advanced').getAttribute('open'),null);for(const id of ['owner-proof-1','owner-proof-4']){const box=await page.getByTestId(id).locator('svg').boundingBox();assert(box&&box.width>70&&box.x>=-1&&box.x+box.width<=width+1,label+' '+id+' visible');}}
   await page.screenshot({path:'admin-proof/'+label+'-'+kind+'.png',fullPage:true});pass(label+'-'+kind+'-responsive');
  }
  await page.goto(base+'/events/event-smoke-20261010',{waitUntil:'networkidle'});
  const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,windowWidth:window.innerWidth}));
  assert(metrics.documentWidth<=metrics.windowWidth+2,label+' has no horizontal overflow: '+JSON.stringify(metrics));
  await page.screenshot({path:'admin-proof/'+label+'-event.png',fullPage:true});
  if(width<850){
   const toggle=page.locator('.mobileMenuButton');
   await toggle.click();
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   await page.getByRole('navigation',{name:'Admin navigation'}).locator('.ownerMoreTools summary').click();
   await page.getByRole('link',{name:'My booths'}).click();
   await page.waitForURL('**/booths');
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  }
 }
 await page.goto(base+'/events/new',{waitUntil:'networkidle'});for(const name of ['customerName','eventName','date'])assert.equal(await page.locator('input[name="'+name+'"]').inputValue(),'');await page.locator('input[name="customerName"]').fill('New test customer');await page.locator('input[name="eventName"]').fill('New test rental');await page.locator('select[name="eventType"]').selectOption('Graduation');assert.equal(await page.locator('.ownerDesignEditor').count(),0);await page.getByRole('link',{name:'Cancel',exact:true}).click();await page.waitForURL('**/events');pass('new-event-form-cancels-without-saving');
 assert.deepEqual(errors,[]);pass('no-browser-errors');
 console.log('Admin routes, event edit and iPad/phone layouts verified.');
}catch(error){results.push({test:'failure',passed:false,message:error.message,stack:error.stack});await page?.screenshot({path:'admin-proof/failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{await writeFile('admin-proof/results.json',JSON.stringify({base,readonly,browser:browser.version(),results},null,2));await prisma?.$disconnect();await page?.context().close();await browser.close();}
