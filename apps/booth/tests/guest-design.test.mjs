import test from 'node:test';
import assert from 'node:assert/strict';
import {guestEventConfig} from '../app/lib/guest-design.mjs';
import {getDesigns,EVENT_LABELS,renderKeepsake} from '../app/lib/keepsake-designs.mjs';

const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const guestImages=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),m=>m[0]);
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];

for(const type of Object.keys(EVENT_LABELS))for(const design of getDesigns(type)){
 test(`legacy ${type}/${design.id} preloads its selected artwork for one and four original poses`,()=>{
  const saved=Object.freeze({type,title:'Taylor Celebration',date:'June 10, 2027',defaultTemplate:design.id,photoFit:'fit',
   details:Object.freeze({partner1:'Taylor',partner2:'Jordan',honoree:'Taylor',graduate:'Taylor',classYear:'2027',company:'Taylor Company',primaryColor:'#09244c',secondaryColor:'#ff962c'}),
   printPackage:Object.freeze({shotsPerSession:4})});
  const before=JSON.stringify(saved),cfg=guestEventConfig(saved);
  assert.notEqual(cfg,saved);
  assert.equal(cfg.guestMode,'approved');
  assert.equal(cfg.defaultTemplate,design.id);
  assert.equal(cfg.details,saved.details);
  assert.equal(cfg.photoFit,'fit');
  assert.equal(cfg.printPackage,saved.printPackage);
  const input={cfg,template:cfg.defaultTemplate,photo:poses[0],id:'guest-proof'};
  const one=renderKeepsake({...input,layout:'card'});
  const four=renderKeepsake({...input,poses,layout:'photo_strip',stripMode:'single'});
  assert.equal(attr(one.match(/<svg\b[^>]*>/)[0],'data-design'),`${type}-${design.id}`);
  assert.equal(attr(four.match(/<svg\b[^>]*>/)[0],'data-design'),`${type}-${design.id}`);
  assert.equal(guestImages(one).length,1);
  assert.equal(guestImages(four).length,4);
  assert.deepEqual(guestImages(four).map(tag=>attr(tag,'href')),poses);
  assert(!four.includes('data-design="arcade-four"'));
  assert.equal(JSON.stringify(saved),before,'guest rendering cannot change saved event configuration');
  assert.equal(saved.guestMode,undefined);
 });
}

test('qualified template keys normalize to stable saved template IDs',()=>{
 const cfg=guestEventConfig({type:'corporate',defaultTemplate:'corporate/corporate-gala',photoFit:'fill'});
 assert.equal(cfg.defaultTemplate,'blush');
 assert.equal(cfg.photoFit,'fill');
});
test('missing or unsupported artwork uses the first safe design without inferring it from customer names or template UUIDs',()=>{
 for(const saved of [undefined,null,{type:'other',defaultTemplate:'unsupported'},
  {type:'other',templateId:'event-template-database-uuid'},
  {type:'graduation',title:'LaMarr',details:{graduate:'LaMarr'}}]){
  const cfg=guestEventConfig(saved);
  assert.equal(cfg.defaultTemplate,'ivory');
  assert.equal(cfg.guestMode,'approved');
 }
});
