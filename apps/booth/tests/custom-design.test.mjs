import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomDesign,validateCustomDesign,isValidCustomDesign,renderCustomDesign,CUSTOM_IMAGE_MAX_BYTES,CUSTOM_DESIGN_MAX_BYTES} from '../app/lib/custom-design.mjs';
import {guestEventConfig} from '../app/lib/guest-design.mjs';
import {normalizeEventConfig,finalizeEventSetup} from '../app/lib/event-config.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {assertApprovedStripWindows} from '../scripts/assert-approved-strips.mjs';
import {assertFourPhotoSheet} from '../scripts/assert-four-photo-sheet.mjs';

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwioAAAAASUVORK5CYII=';
const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const upload=()=>{const spec=createCustomDesign('upload');spec.layouts.one.image=PNG;spec.layouts.four.image=PNG;return spec;};
const config=spec=>({type:'graduation',guestMode:'approved',defaultTemplate:'custom',customDesign:spec,
 title:'Original event title',approvedPrintName:'Taylor & Jordan',date:'June 10, 2027',photoFit:'fit',details:{graduate:'Wrong old name',classYear:'2027'}});
const guestImages=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),m=>m[0]);
const href=tag=>tag.match(/ href="([^"]*)"/)?.[1];
const slots=svg=>guestImages(svg).map(tag=>{
 const attr=name=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];
 return {...Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(attr(key))])),pose:Number(attr('data-pose')),copy:Number(attr('data-copy')),source:href(tag)};
});
const legacyStrips=()=>{
 const spec=createCustomDesign();spec.layouts.four.copies=2;
 spec.layouts.four.rects=[0,1,2,3].map(i=>({x:26/12,y:(120+350*i)/18,w:548/12,h:336/18}));
 return spec;
};

test('builder starts with paired 4x6 layouts and independent editable rectangles',()=>{
 const original=createCustomDesign(),valid=validateCustomDesign(original);
 assert.equal(valid.layouts.one.rects.length,1);assert.equal(valid.layouts.four.rects.length,4);
 assert.notEqual(valid,original);assert.notEqual(valid.layouts.four.rects,original.layouts.four.rects);
 valid.layouts.four.rects[0].y=1;
 assert.equal(original.layouts.four.rects[0].y,144/18);
 assert(isValidCustomDesign(createCustomDesign()));
 assert.throws(()=>createCustomDesign('unknown'));
});
test('new custom four-photo layouts use the wide sheet while saved customer windows remain unchanged',()=>{
 const fresh=createCustomDesign();
 assert.equal(fresh.layouts.four.copies,undefined,'new builder uses four unique poses once on the full sheet');
 const freshSvg=renderCustomDesign({cfg:config(fresh),poses,layout:'photo_strip'});
 assertFourPhotoSheet(slots(freshSvg),'new custom builder');
 const saved=createCustomDesign();delete saved.layouts.four.copies;saved.layouts.four.rects=[14,31,48,65].map(y=>({x:8,y,w:84,h:15}));
 const before=JSON.stringify(saved.layouts.four.rects),cfg=config(saved);
 const valid=validateCustomDesign(saved),svg=renderCustomDesign({cfg,poses,layout:'photo_strip'});
 assert.equal(JSON.stringify(valid.layouts.four.rects),before,'existing customer artwork coordinates are never migrated');
 const actual=guestImages(svg).map(tag=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(tag.match(new RegExp(' '+key+'="([^"]*)"'))?.[1])])));
 assert.deepEqual(actual,saved.layouts.four.rects.map(r=>({x:r.x*12,y:r.y*18,width:r.w*12,height:r.h*18})),
  'each uploaded or built customer window retains its approved position');
});
test('saved custom designs explicitly approved as two strips retain their coordinates and copies',()=>{
 const saved=legacyStrips(),before=JSON.stringify(saved.layouts.four);
 const valid=validateCustomDesign(saved),svg=renderCustomDesign({cfg:config(saved),poses,layout:'photo_strip'});
 assert.equal(JSON.stringify(valid.layouts.four),before,'previously approved two-copy artwork is never migrated');
 assertApprovedStripWindows(slots(svg),'saved custom matching strips');
 assert.deepEqual(guestImages(svg).map(href),[...poses,...poses]);
});
test('new builder copy markers cannot silently duplicate existing uploaded frames',()=>{
 const spec=upload(),valid=validateCustomDesign(spec);
 assert.equal(valid.layouts.four.copies,undefined,'a complete uploaded 4x6 frame keeps its existing four approved windows');
 assert.deepEqual(guestImages(renderCustomDesign({cfg:config(spec),poses,layout:'photo_strip'})).map(href),poses);
 for(const copies of [0,3,'2',NaN]){
  const invalid=createCustomDesign();invalid.layouts.four.copies=copies;
  assert.throws(()=>validateCustomDesign(invalid),/copies|copy|strips/i,'only explicit supported copy counts are accepted');
 }
 const outside=legacyStrips();outside.layouts.four.rects[0].x=30;
 assert.throws(()=>validateCustomDesign(outside),/half|strip|copy/i,'a duplicated window cannot spill into the other strip');
});
test('only the owner sample preview can render an incomplete paired upload',()=>{
 const draft=createCustomDesign('upload');draft.layouts.one.image=PNG;
 assert.throws(()=>validateCustomDesign(draft),/both/);
 assert(!isValidCustomDesign(draft));
 assert(isValidCustomDesign(draft,{allowIncompleteUpload:true}));
 assert.match(renderCustomDesign({cfg:config(draft),sample:true,layout:'card'}),/data-custom-artwork="true"/);
 assert.throws(()=>renderCustomDesign({cfg:config(draft),photo:poses[0],layout:'card'}),/both/);
 assert.throws(()=>guestEventConfig(config(draft)),/both/);
});
for(const bad of ['https://example.test/frame.png','/api/image.png','file:///tmp/frame.png','javascript:alert(1)',
 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+',
 'data:image/png;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+',
 'data:image/jpeg;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIi8+',
 'data:image/png;base64,AAAA=','data:image/png;base64,%%']){
 test(`custom artwork rejects unsupported or forged input ${bad.slice(0,42)}`,()=>{
  const spec=upload();spec.layouts.one.image=bad;
  assert.throws(()=>validateCustomDesign(spec));
  assert.throws(()=>validateCustomDesign(spec,{allowIncompleteUpload:true}));
 });
}
test('custom raster and combined body sizes are bounded',()=>{
 const spec=upload();
 spec.layouts.one.image='data:image/png;base64,'+Buffer.alloc(CUSTOM_IMAGE_MAX_BYTES+1).toString('base64');
 assert.throws(()=>validateCustomDesign(spec),/300 KB/);
 const bytes=Buffer.alloc(CUSTOM_IMAGE_MAX_BYTES);Buffer.from(PNG.split(',')[1],'base64').copy(bytes);
 const pair=upload();pair.layouts.one.image=pair.layouts.four.image='data:image/png;base64,'+bytes.toString('base64');
 assert.throws(()=>validateCustomDesign(pair),/combined custom artwork is too large/);
 assert.equal(CUSTOM_IMAGE_MAX_BYTES,300000);assert.equal(CUSTOM_DESIGN_MAX_BYTES,800000);
});
for(const rect of [{x:-1,y:0,w:10,h:10},{x:95,y:0,w:10,h:10},{x:0,y:95,w:10,h:10},
 {x:0,y:0,w:0,h:10},{x:0,y:0,w:NaN,h:10},{x:0,y:0,w:Infinity,h:10},{x:'1',y:0,w:10,h:10}]){
 test('custom photo windows reject invalid coordinates '+JSON.stringify(rect),()=>{
  const spec=createCustomDesign();spec.layouts.one.rects=[rect];
  assert.throws(()=>validateCustomDesign(spec),/inside the sheet/);
 });
}
test('paired layouts reject overlapping windows and wrong pose counts',()=>{
 const spec=createCustomDesign();spec.layouts.four.rects[1]={...spec.layouts.four.rects[0]};
 assert.throws(()=>validateCustomDesign(spec),/overlap/);
 spec.layouts.four.rects.pop();assert.throws(()=>validateCustomDesign(spec),/4 photo windows/);
 const missing=createCustomDesign();delete missing.layouts.one;
 assert.throws(()=>validateCustomDesign(missing),/both/);
});
test('builder uses the actual captured one and four poses, preserves order and contained fitting',()=>{
 const cfg=config(createCustomDesign()),one=renderCustomDesign({cfg,photo:poses[0],layout:'card',id:'one'});
 const four=renderCustomDesign({cfg,photo:poses[0],poses,layout:'photo_strip',id:'four'});
 assert.equal(guestImages(one).length,1);assert.equal(guestImages(four).length,4);
 assert.deepEqual(guestImages(four).map(href),poses);
 assert(guestImages(four).every(tag=>tag.includes('preserveAspectRatio="xMidYMid meet"')));
 assert.match(one,/viewBox="0 0 1200 1800"/);assert.match(four,/data-pose-count="4"/);
 assert.match(one,/Taylor &amp; Jordan/);assert.match(four,/June 10, 2027/);
 assert(!one.includes('Wrong old name'));assert(!four.includes('Wrong old name'));
 assert.throws(()=>renderCustomDesign({cfg,poses:poses.slice(0,3),layout:'photo_strip'}),/Not all/);
 assert.throws(()=>renderCustomDesign({cfg,photo:'https://example.test/person.jpg',layout:'card'}),/missing or invalid/);
});
test('uploaded completed frames retain their own text and place live photos above artwork',()=>{
 const spec=upload();spec.heading='Do not add heading';spec.footer='Do not add footer';
 const cfg=config(spec),one=renderCustomDesign({cfg,photo:poses[0],layout:'card'}),four=renderCustomDesign({cfg,poses,layout:'photo_strip'});
 for(const svg of [one,four]){
  assert(svg.indexOf('data-custom-artwork="true"')<svg.indexOf('data-guest-photo="true"'));
  assert(!svg.includes('data-text-role="name"'));assert.doesNotMatch(svg,/<text\b[^>]*data-copy=/,'uploaded frames keep their own text rather than overlaying builder labels');
  assert(!svg.includes('June 10, 2027'));assert(!svg.includes('Do not add heading'));assert(!svg.includes('Do not add footer'));
  assert.match(svg,/<rect[^>]*fill="#e5e6df"/);
 }
 assert.deepEqual(guestImages(four).map(href),poses);
});
test('uploaded artwork covers the whole 4x6 sheet even when its aspect ratio differs from paper',()=>{
 // This valid one-pixel square is deliberately not a 2:3 print image. The
 // artwork must cover the paper while photoFit still controls the guest photo.
 const cfg=config(upload());
 for(const layout of ['card','photo_strip']){
  const svg=renderCustomDesign({cfg,photo:poses[0],poses,layout});
  const art=svg.match(/<image\b(?=[^>]*data-custom-artwork="true")[^>]*\/>/)[0];
  assert.match(art,/x="0" y="0" width="1200" height="1800"/);
  assert.match(art,/preserveAspectRatio="xMidYMid slice"/,
   'uploaded artwork fills the paper rather than leaving contain margins');
  assert(guestImages(svg).every(image=>image.includes('preserveAspectRatio="xMidYMid meet"')),
   'the selected fit for actual guest photos is preserved separately');
 }
});
test('switching to builder retains uploaded assets without hiding the builder colors and text',()=>{
 const spec=upload();spec.mode='build';spec.background='#123456';
 const svg=renderCustomDesign({cfg:config(spec),photo:poses[0]});
 assert(!svg.includes('data-custom-artwork="true"'));
 assert.match(svg,/fill="#123456"/);assert.match(svg,/data-text-role="name"/);
 assert.equal(validateCustomDesign(spec).layouts.one.image,PNG);
});
test('untrusted custom copy and color never become executable SVG attributes',()=>{
 const spec=createCustomDesign();spec.heading='<script>alert(1)</script>';spec.footer='" onload="alert(2)';
 const valid=validateCustomDesign(spec),svg=renderCustomDesign({cfg:config(valid),sample:true});
 assert(!svg.includes('<script>'));assert(!svg.includes(' onload="alert'));
 spec.ink='red" onload="alert(3)';assert.throws(()=>validateCustomDesign(spec),/six-digit color/);
});
test('custom configuration is validated before guest load and staff setup without mutating stored values',()=>{
 const spec=createCustomDesign(),saved=config(spec),before=JSON.stringify(saved);
 const guest=guestEventConfig(saved),normalized=normalizeEventConfig(saved);
 assert.equal(guest.defaultTemplate,'custom');assert.equal(normalized.defaultTemplate,'custom');
 assert.notEqual(guest.customDesign,saved.customDesign);
 const final=finalizeEventSetup({...saved,type:'graduation',details:{graduate:'Taylor',classYear:'2027'},printLayouts:{cardEnabled:true,stripEnabled:true,defaultLayout:'card',stripMode:'single'}});
 assert.equal(final.defaultTemplate,'custom');assert.equal(final.customDesign.layouts.four.rects.length,4);
 assert.equal(JSON.stringify(saved),before);
 const broken={...saved,customDesign:{v:99}};
 assert.throws(()=>guestEventConfig(broken));assert.throws(()=>normalizeEventConfig(broken));
 assert.throws(()=>normalizeEventConfig({...broken,title:'Bryan Wedding',details:{}}));
 assert.throws(()=>finalizeEventSetup({...broken,type:'other',details:{eventName:'Taylor'},printLayouts:final.printLayouts}));
});
test('shared renderer dispatches custom outputs and preserves explicit builtin preview choices',()=>{
 const cfg=config(createCustomDesign());
 const one=renderKeepsake({cfg,photo:poses[0],layout:'card'});
 const four=renderKeepsake({cfg,template:'custom',poses,layout:'photo_strip',filter:'grayscale(1) contrast(1.08) brightness(1.04)',id:'custom-test'});
 assert.match(one,/data-template-key="graduation\/custom"/);
 assert.deepEqual(guestImages(four).map(href),poses);
 assert(guestImages(four).every(image=>image.includes('data-photo-finish="bw"')));
 const builtin=renderKeepsake({cfg,template:'ivory',photo:poses[0],layout:'card'});
 assert.match(builtin,/data-template-key="graduation\/honors-edit"/);
 assert(!builtin.includes('data-custom-mode='));
});
