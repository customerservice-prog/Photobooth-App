import test from 'node:test';
import assert from 'node:assert/strict';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {guestEventConfig} from '../app/lib/guest-design.mjs';
import {validateBoothHandoff,configFromBoothHandoff} from '../app/lib/booth-handoff.mjs';
import {finalizeEventSetup} from '../app/lib/event-config.mjs';

const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const payload={v:1,id:'royal-quince-test',rev:'2026-10-09T12:00:00.000Z',title:'Sofia’s quinceañera',name:'Sofia',
 date:'2027-06-10',start:'18:00',end:'22:00',type:'other',f:'four',p:6,mode:'card',s:1,fit:'fill',
 a:'#442057',b:'#bc915c',limit:108,on:true,qr:true,design:'quince-royal',guest:'approved'};
const images=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),match=>match[0]);
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];

test('royal Quinceañera handoff keeps the approved name, date and specific artwork',()=>{
 const checked=validateBoothHandoff(payload),cfg=guestEventConfig(configFromBoothHandoff(checked));
 assert.equal(cfg.defaultTemplate,'quince-royal');
 assert.equal(cfg.approvedPrintName,'Sofia');
 for(const total of [1,4]){
  const svg=renderKeepsake({cfg,template:cfg.defaultTemplate,photo:poses[0],poses,layout:total===1?'card':'photo_strip',stripMode:'single'});
  assert.match(svg,/viewBox="0 0 1200 1800"/);
  assert.match(svg,/data-design="other-quince-royal"/);
  assert.match(svg,/data-artwork="quince-crown"/);
  assert.match(svg,/#e9d8f5/);assert.match(svg,/#442057/);assert.match(svg,/Sofia/);assert.match(svg,/June 10, 2027/);
  assert.equal(images(svg).length,total);
  assert.deepEqual(images(svg).map(tag=>attr(tag,'href')),poses.slice(0,total));
  assert(!svg.includes('Good People'));assert(!svg.includes('Gabriela'));
 }
});
test('four royal Quinceañera poses occupy four distinct vertical windows without duplicating the collage',()=>{
 const cfg=guestEventConfig(configFromBoothHandoff(payload));
 const svg=renderKeepsake({cfg,template:cfg.defaultTemplate,photo:poses[0],poses,layout:'photo_strip',stripMode:'single'});
 const cells=images(svg).map(tag=>Object.fromEntries(['x','y','width','height'].map(name=>[name,Number(attr(tag,name))])));
 assert.equal(new Set(cells.map(cell=>cell.x)).size,1);
 for(let i=0;i<cells.length;i++){
  const cell=cells[i];assert(cell.x>=0&&cell.y>=0&&cell.x+cell.width<=1200&&cell.y+cell.height<=1800);
  if(i)assert(cells[i-1].y+cells[i-1].height<cell.y);
 }
 assert.throws(()=>renderKeepsake({cfg,template:cfg.defaultTemplate,photo:poses[0],poses:poses.slice(0,3),layout:'photo_strip'}),/received/);
});
test('royal artwork survives local setup validation and remains limited to its Other family',()=>{
 const cfg=finalizeEventSetup({type:'other',date:'June 10, 2027',details:{eventName:'Sofia'},defaultTemplate:'quince-royal'});
 assert.equal(cfg.defaultTemplate,'quince-royal');
 assert.throws(()=>validateBoothHandoff({...payload,type:'wedding'}),/not a valid/);
 const saved=guestEventConfig(configFromBoothHandoff({...payload,fit:'fit'}));
 const svg=renderKeepsake({cfg:saved,template:saved.defaultTemplate,photo:poses[0],poses,layout:'photo_strip'});
 assert.equal(images(svg).filter(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid meet').length,4);
});
