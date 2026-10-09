import test from 'node:test';
import assert from 'node:assert/strict';
import {renderKeepsake,getDesigns,EVENT_LABELS} from '../app/lib/keepsake-designs.mjs';
import {approvedGridCells} from '../app/lib/approved-photo-grid.mjs';
import {containedPhotoBox} from '../app/lib/templates/svg-kit.mjs';
const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const guestImages=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),m=>m[0]);
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];
function outsidePhotoRegion(svg){
 const start=svg.includes('data-design="other-quince-royal"')?svg.indexOf('<g data-quince-photo-region="true"'):svg.indexOf('<g clip-path="url(#proof-photo)">');
 assert(start>=0,'template has its original photo frame');
 const groups=/<\/?g\b[^>]*>/g;groups.lastIndex=start;
 let depth=0,end=-1,match;
 while((match=groups.exec(svg))){depth+=match[0].startsWith('</')?-1:1;if(depth===0){end=groups.lastIndex;break;}}
 assert(end>start,'complete photo region');
 return svg.slice(0,start)+svg.slice(end);
}
for(const type of Object.keys(EVENT_LABELS))for(const design of getDesigns(type).filter(d=>d.id!=='grad-gala')){
 test(type+'/'+design.id+' keeps every approved artwork element when four real poses replace one photo',()=>{
  const cfg={type,guestMode:'approved',approvedPrintName:'Taylor’s Event',title:'Taylor’s Event',date:'June 10, 2027',photoFit:'fill',
   details:{honoree:'Taylor',graduate:'Taylor',classYear:'2027',primaryColor:'#09244c',secondaryColor:'#ff962c'},printPackage:{shotsPerSession:4}};
  const input={cfg,template:design.id,id:'proof',photo:poses[0]};
  const one=renderKeepsake({...input,layout:'card'}),four=renderKeepsake({...input,poses,layout:'photo_strip',stripMode:'single'});
  assert.equal(guestImages(one).length,1);assert.equal(guestImages(four).length,4);
  assert.equal(attr(one.match(/<svg\b[^>]*>/)[0],'data-design'),attr(four.match(/<svg\b[^>]*>/)[0],'data-design'));
  assert.equal(outsidePhotoRegion(four),outsidePhotoRegion(one),'names, date, decoration, frame and palette remain identical');
  assert.deepEqual(guestImages(four).map(tag=>attr(tag,'href')),poses,'original poses appear once each in chronological row order');
  assert.deepEqual(guestImages(four).map(tag=>attr(tag,'data-pose')),['1','2','3','4']);
  assert(guestImages(four).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid slice'));
  const fit=renderKeepsake({...input,cfg:{...cfg,photoFit:'fit'},poses,layout:'photo_strip'});
  assert(guestImages(fit).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid meet'),'each pose respects whole-photo framing');
  const sample=renderKeepsake({...input,photo:'',poses:[],sample:true,layout:'photo_strip'});
  assert.equal(guestImages(sample).length,0,'welcome uses empty numbered panes without invented guests');
  for(let n=1;n<=4;n++)assert(sample.includes('PHOTO '+n));
 });
}
test('the four-photo grid fits inside the actual arched and rounded frame shapes',()=>{
 const arch={x:166,y:220,w:868,h:1100,shape:'arch'},safe=containedPhotoBox(arch,true),radius=arch.w/2,cx=arch.x+radius,cy=arch.y+radius;
 for(const cell of approvedGridCells(safe))for(const x of [cell.x,cell.x+cell.w])for(const y of [cell.y,cell.y+cell.h]){
  assert(x>=arch.x&&x<=arch.x+arch.w&&y<=arch.y+arch.h);
  if(y<cy)assert((x-cx)**2+(y-cy)**2<=radius**2);
 }
 const round={x:156,y:330,w:888,h:915,radius:34},cells=approvedGridCells(round),corner=cells[0];
 assert((corner.x-(round.x+round.radius))**2+(corner.y-(round.y+round.radius))**2<=round.radius**2);
 assert(cells[0].x+cells[0].w<cells[1].x);assert(cells[0].y+cells[0].h<cells[2].y);
});
test('missing or invalid original poses cannot produce an approved four-photo keepsake',()=>{
 const cfg={type:'other',guestMode:'approved'};
 for(const originals of [undefined,[],poses.slice(0,3),[...poses.slice(0,3),'https://invalid.example/photo.jpg']]){
  assert.throws(()=>renderKeepsake({cfg,photo:poses[0],poses:originals,layout:'photo_strip'}),/complete|configured|missing|invalid/i);
 }
});
test('existing grad-gala layouts and unapproved classic strips retain their dedicated renderers',()=>{
 const graduation={type:'graduation',guestMode:'approved',details:{graduate:'Taylor',classYear:'2027'},printPackage:{shotsPerSession:4}};
 const gala=renderKeepsake({cfg:graduation,template:'grad-gala',photo:poses[0],poses,layout:'photo_strip',stripMode:'single'});
 assert(gala.includes('data-design="graduation-grad-gala"'));assert(!gala.includes('data-approved-photo-region'));
 const legacy=renderKeepsake({cfg:{type:'other',printPackage:{shotsPerSession:4}},photo:poses[0],poses,layout:'photo_strip',stripMode:'single'});
 assert(legacy.includes('data-design="arcade-four"'));assert(!legacy.includes('data-approved-photo-region'));
});
