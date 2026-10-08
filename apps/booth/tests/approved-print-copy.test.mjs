import test from 'node:test';
import assert from 'node:assert/strict';
import {configFromBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {eventCopy,getDesigns,renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {eventMonogram} from '../app/lib/event-config.mjs';

const base={v:1,id:'approved-print-event',rev:'2026-10-08T12:00:00.000Z',title:'Staff booking title',date:'2027-06-10',start:'17:00',end:'21:00',f:'four',p:6,mode:'card',s:1,fit:'fill',a:'#09244c',b:'#ff962c',limit:108,on:true,qr:true,design:'ivory',guest:'approved'};
const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const escape=value=>value.replace(/&/g,'&amp;');

for(const {type,name,details,legacyTitle} of [
 {type:'wedding',name:'Morgan & Riley',details:{partner1:'Old Partner',partner2:'Previous Partner',venue:'Garden House'},legacyTitle:'Old Partner & Previous Partner'},
 {type:'corporate',name:'Team Celebration',details:{company:'Old Company',eventName:'Previous Annual Gala'},legacyTitle:'Old Company'}
]){
 test(`${type} imported approved name and date reach one-photo and four-photo prints`,()=>{
  const cfg=configFromBoothHandoff({...base,type,name},{details});
  const copy=eventCopy(cfg);
  assert.equal(copy.title,name);
  assert.equal(copy.date,'June 10, 2027');
  for(const design of getDesigns(type)){
   const svg=renderKeepsake({cfg,template:design.id,photo:poses[0]});
   assert(svg.includes(`<title>${escape(name)}</title>`));
   assert(svg.includes('data-copy="June 10, 2027"'));
   assert(!svg.includes(escape(legacyTitle)));
  }
  const four=renderKeepsake({cfg,template:'ivory',poses,layout:'photo_strip',stripMode:'single'});
  assert(four.includes(escape(name)));
  assert(four.includes('data-copy="June 10, 2027"'));
  assert(!four.includes(escape(legacyTitle)));
 });
 test(`${type} demo and legacy event names retain their existing priority`,()=>{
  for(const guestMode of [undefined,'demo']){
   assert.equal(eventCopy({type,title:'Legacy event',approvedPrintName:name,guestMode,details}).title,legacyTitle);
  }
  assert.equal(eventCopy({type,guestMode:'approved',approvedPrintName:'  ',details}).title,legacyTitle);
 });
}

test('approved event initials use the approved print name instead of older names or booking titles',()=>{
 assert.equal(eventMonogram({type:'wedding',guestMode:'approved',approvedPrintName:'Morgan & Riley',title:'Staff booking title',details:{partner1:'Old Partner',partner2:'Previous Partner'}}),'MR');
 assert.equal(eventMonogram({type:'wedding',guestMode:'approved',approvedPrintName:'Morgan AND Riley',details:{partner1:'Old Partner',partner2:'Previous Partner'}}),'MR');
 assert.equal(eventMonogram({type:'corporate',guestMode:'approved',approvedPrintName:'Team Celebration',title:'Staff booking title'}),'TC');
});

test('demo, legacy and blank approved initials retain the previous behavior',()=>{
 const cfg={type:'wedding',title:'Staff booking title',approvedPrintName:'Morgan & Riley',details:{partner1:'Old Partner',partner2:'Previous Partner'}};
 for(const guestMode of [undefined,'demo'])assert.equal(eventMonogram({...cfg,guestMode}),'OP');
 assert.equal(eventMonogram({...cfg,guestMode:'approved',approvedPrintName:'  '}),'OP');
 assert.equal(eventMonogram({type:'corporate',guestMode:'demo',approvedPrintName:'Team Celebration',title:'Staff and Customer'}),'SC');
});
