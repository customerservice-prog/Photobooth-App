import test from 'node:test';
import assert from 'node:assert/strict';
import {renderKeepsake,getDesigns} from '../app/lib/keepsake-designs.mjs';
import {graduationShowcaseConfig,startGraduationShowcase,GRADUATION_SHOWCASE_KEY} from '../app/lib/graduation-showcase.mjs';
import {workspace} from '../app/lib/event-workspace.mjs';
import {finalizeEventSetup} from '../app/lib/event-config.mjs';

const cfg={type:'graduation',title:'LaMarr',date:'October 10, 2026',
 details:{graduate:'LaMarr',classYear:'2026'},defaultTemplate:'grad-gala',
 printPackage:{shotsPerSession:4}};
const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,AA'+n+'=');

test('navy and gold graduation style is an explicit selectable design',()=>{
 const designs=getDesigns('graduation');
 assert.equal(designs.length,4);
 assert.equal(designs.at(-1).id,'grad-gala');
 assert.equal(getDesigns('wedding').length,3);
 assert.equal(getDesigns('birthday').length,3);
});
test('four-photo graduation print uses four different original guest poses in order',()=>{
 const svg=renderKeepsake({layout:'photo_strip',stripMode:'single',cfg,template:'grad-gala',poses,photo:poses[0]});
 assert.match(svg,/data-design="graduation-grad-gala"/);
 assert.match(svg,/viewBox="0 0 1200 1800"/);
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,4);
 assert.deepEqual([...svg.matchAll(/data-pose="(\d)" href="([^"]+)"/g)].map(m=>m[2]),poses);
 assert.match(svg,/OCTOBER 10TH 2026/);
 assert.match(svg,/LaMarr/);
 assert.match(svg,/2026/);
 assert.doesNotMatch(svg,/Page 1 of 1|photobooth\.com/);
});
test('one-photo 4×6 graduation print contains only the chosen original JPEG',()=>{
 const svg=renderKeepsake({layout:'card',cfg,template:'grad-gala',photo:poses[0]});
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,1);
 assert(svg.includes(poses[0]));
 assert(!svg.includes(poses[1]));
});
test('graduate name and class year remain customizable and cannot inject SVG',()=>{
 const newCfg={...cfg,title:'Taylor',details:{graduate:'Taylor & Friends',classYear:'2027'}};
 const svg=renderKeepsake({layout:'card',cfg:newCfg,template:'grad-gala',photo:poses[0]});
 assert.match(svg,/Taylor &amp; Friends/);
 assert.match(renderKeepsake({layout:'photo_strip',cfg:newCfg,template:'grad-gala',poses}),/2027/);
 assert.doesNotMatch(renderKeepsake({layout:'card',cfg:{...cfg,details:{...cfg.details,graduate:'<script>alert(1)</script>'}},template:'grad-gala',photo:poses[0]}),/<script>/);
 assert.doesNotMatch(renderKeepsake({layout:'card',cfg,template:'grad-gala',photo:'https://bad.example/person.jpg'}),/<image data-guest-photo/);
});
test('unrelated grad and other events do not silently switch designs based on a name',()=>{
 const standard=renderKeepsake({layout:'card',cfg,template:'ivory',photo:poses[0]});
 assert.doesNotMatch(standard,/data-design="graduation-grad-gala"/);
 const other=renderKeepsake({layout:'card',cfg:{...cfg,type:'other'},template:'grad-gala',photo:poses[0]});
 assert.doesNotMatch(other,/data-design="graduation-grad-gala"/);
});
test('graduation gala is saved by final event configuration',()=>{
 const next=finalizeEventSetup({...cfg,printLayouts:{cardEnabled:true,stripEnabled:true,defaultLayout:'photo_strip'},preparation:{colorsConfirmed:true,checks:{}},setupComplete:true});
 assert.equal(next.defaultTemplate,'grad-gala');
});
test('graduation showcase is isolated and never changes paid customer counters or photos',()=>{
 const storage=new Map([['friendly-booth-oct10-2026-v2-config','protected booking'],['friendly-booth-oct10-2026-v2-live-usage','78'],['paid-customer-photos','private archive']]);
 const save={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null};
 const before=Object.fromEntries(storage);
 assert.equal(startGraduationShowcase(save,{name:'LaMarr',year:'2026'}),'/?booth_event=graduation-showcase');
 const show=JSON.parse(storage.get(GRADUATION_SHOWCASE_KEY));
 assert.equal(show.defaultTemplate,'grad-gala');
 assert.equal(show.type,'graduation');
 for(const [k,v]of Object.entries(before))assert.equal(storage.get(k),v);
 const target=workspace('?booth_event=graduation-showcase');
 assert.equal(target.imported,true);
 assert.equal(target.demo,true);
 assert.equal(target.config,GRADUATION_SHOWCASE_KEY);
 assert.notEqual(target.archive,workspace('?event=oct10-2026&demo=1').archive);
});
