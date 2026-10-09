import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {configFromBoothHandoff,decodeBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {workspace,EVENT_KEYS} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {canCloseImportedEvent,clearClosedEventSettings,EVENT_CLOSE_CONFIRMATION,galleryZipFilename} from '../app/lib/event-lifecycle.mjs';
const shots=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const BASE={v:1,id:'rental-event-2027',rev:'2026-10-08T12:00:00.000Z',title:'Taylor Graduation',date:'2027-06-10',start:'17:00',end:'21:00',type:'graduation',f:'four',p:6,mode:'strip',s:1,fit:'fill',a:'#09244c',b:'#ff962c',limit:108,on:true,qr:true,design:'grad-gala',name:'Taylor',year:'2027',guest:'approved'};
const encode=p=>Buffer.from(JSON.stringify(p)).toString('base64url');
function storage(seed={}){
 const data=new Map(Object.entries(seed));
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size;},all:()=>Object.fromEntries(data)};
}
test('approved admin handoff gives iPad one print theme and personalizes name/year',()=>{
 const payload=decodeBoothHandoff(encode(BASE));
 const cfg=configFromBoothHandoff(payload);
 assert.equal(cfg.guestMode,'approved');
 assert.equal(cfg.defaultTemplate,'grad-gala');
 assert.equal(cfg.approvedPrintName,'Taylor');
 assert.equal(cfg.details.graduate,'Taylor');
 assert.equal(cfg.details.classYear,'2027');
 assert.equal(cfg.printLayouts.defaultLayout,'photo_strip');
 assert.equal(cfg.printPackage.includedPrints,108);
});
test('one photo and four original photos use the identical customer-approved style',()=>{
 const cfg=configFromBoothHandoff(BASE);
 const one=renderKeepsake({photo:shots[0],cfg,template:cfg.defaultTemplate,layout:'card'});
 const four=renderKeepsake({photo:shots[0],poses:shots,cfg,template:cfg.defaultTemplate,layout:'photo_strip',stripMode:'single'});
 assert.match(one,/data-design="graduation-grad-gala"/);assert.match(four,/data-design="graduation-grad-gala"/);
 assert.equal((one.match(/data-guest-photo="true"/g)||[]).length,1);
 assert.equal((four.match(/data-guest-photo="true"/g)||[]).length,4);
 for(const shot of shots)assert(four.includes(shot));
 assert.match(one,/Taylor/);assert.match(four,/Taylor/);
 assert.match(four,/2027/);
});
test('approved non-graduation photo strips inherit the customer-approved colors',()=>{
 const cfg=configFromBoothHandoff({...BASE,type:'other',design:'champagne',name:'Taylor’s Celebration'});
 const svg=renderKeepsake({photo:shots[0],poses:shots,cfg,template:cfg.defaultTemplate,layout:'photo_strip'});
 assert.match(svg,/#09244c/);
 assert.match(svg,/#ff962c/);
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,4);
});
test('new template cannot be smuggled into an unrelated event',()=>{
 assert.throws(()=>decodeBoothHandoff(encode({...BASE,type:'other',design:'grad-gala'})),/not a valid/i);
 assert.throws(()=>decodeBoothHandoff(encode({...BASE,name:'<img onerror=bad>'})),/not a valid/i);
 assert.throws(()=>decodeBoothHandoff(encode({...BASE,year:'20<script>'})),/not a valid/i);
});
test('guest print screen only exposes Print, Send and Done, no design gallery',async()=>{
 const source=await readFile(new URL('../app/components/GuestReadyPreview.js',import.meta.url),'utf8');
 assert.match(source,/data-testid="approved-guest-preview"/);
 assert.match(source,/data-testid="approved-finished-jpeg"/);
 assert.match(source,/data-testid="approved-done"/);
 assert.match(source,/data-testid="approved-print"/);
 assert.match(source,/data-testid="approved-digital-copy"/);
 assert(!source.includes('data-testid="approved-retake"'));
 for(const item of ['ksGallery','onTemplate','onCommitEvent','onFilter','Photo adjustments','layout-card','strip-arrangement','Edit event'])assert(!source.includes(item),item+' must not appear for guests');
 assert.match(source,/makeKeepsakeExport/);
 assert.match(source,/onArchive\(prepared\)/);
});
test('every captured guest session uses the simplified finished preview, including saved local events',async()=>{
 const source=await readFile(new URL('../app/page.js',import.meta.url),'utf8');
 assert.match(source,/<GuestReadyPreview photo=\{photo\} poses=\{poses\}/);
 assert(!source.includes('<PhotoPreview'),'legacy event routes must not reopen the design gallery');
});
test('closing one event never touches the saved files or counters of another event',()=>{
 const scope=workspace('?booth_event='+BASE.id),other=workspace('?booth_event=another-customer');
 const data=storage({
  [scope.config]:'A',[scope.previous]:'B',[scope.usage]:'7',
  [scope.photos]:'C',['friendly-booth-backup-token-v1-'+BASE.id]:'private-token',
  ['friendly-booth-uploaded-v1-'+scope.archive+'-capture1-keepsake']:'yes',
  ['friendly-booth-print-ledger-v1-'+BASE.id+'-transfer']:'log',
  [other.config]:'other-settings',[other.usage]:'23',
  [EVENT_KEYS.liveUsage]:'55',[ACTIVE_EVENT_KEY]:BASE.id,'friendly-booth-assigned-event-v1':BASE.id,
  'friendly-booth-screen-awake-v1':'on'
 });
 assert.equal(canCloseImportedEvent(scope),true);
 assert.equal(canCloseImportedEvent(workspace('?event=oct10-2026')),false);
 assert.equal(canCloseImportedEvent(workspace('?booth_event=graduation-showcase')),false);
 clearClosedEventSettings(data,scope);
 for(const k of [scope.config,scope.previous,scope.usage,scope.photos,ACTIVE_EVENT_KEY])assert.equal(data.getItem(k),null);
 assert.equal(data.getItem(other.config),'other-settings');
 assert.equal(data.getItem(other.usage),'23');
 assert.equal(data.getItem(EVENT_KEYS.liveUsage),'55');
 assert.equal(data.getItem('friendly-booth-screen-awake-v1'),'on');
 assert.equal(EVENT_CLOSE_CONFIRMATION,'CLOSE EVENT');
 assert.match(galleryZipFilename('Wedding / Reception!'),/^Wedding-Reception-all-digital-photos\.zip$/);
});
