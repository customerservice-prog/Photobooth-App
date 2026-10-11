import test from 'node:test';
import assert from 'node:assert/strict';
import {FPR_PRINT_PRESETS} from '../app/lib/fpr-print-presets.mjs';
import {renderFprPrint} from '../app/lib/fpr-print-renderer.mjs';
import {assertApprovedStripWindows} from '../scripts/assert-approved-strips.mjs';

const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];
const box=tag=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(attr(tag,key))]));
const images=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),match=>match[0]);
const regions=svg=>Array.from(svg.matchAll(/<g data-approved-photo-region="true"[^>]*>(?:<defs>[\s\S]*?<\/defs>)?(<rect\b[^>]*\/>)/g),match=>box(match[1]));
const slots=svg=>images(svg).map(tag=>({...box(tag),pose:Number(attr(tag,'data-pose')),copy:Number(attr(tag,'data-copy')),source:attr(tag,'href')}));

const referencePhotoPanels={
 graduation:[[32,120,355,160],[32,289,355,159],[32,456,355,155]],
 wedding:[[35,156,350,283],[35,450,350,284]],
 birthday:[[32,102,346,207],[32,318,346,214],[32,538,346,206]],
 quince:[[28,170,363,220],[28,401,363,220],[28,633,363,225]],
 corporate:[[22,144,375,229],[22,386,375,231],[22,630,375,230]],
};


for(const preset of FPR_PRINT_PRESETS){
 test(preset.name+' has one large photograph or two matching landscape four-photo strips filling one sheet',()=>{
  const cfg={approvedPrintName:'Jordan & Avery',date:'June 10, 2027',details:{classYear:'2027'}};
  const input={template:preset.id,cfg,photo:poses[0],poses,id:'proof'};
  const one=renderFprPrint({...input,layout:'card'}),four=renderFprPrint({...input,layout:'photo_strip'});
  assert.equal(regions(one).length,1,'one-photo layout must never repeat the image in old reference openings');
  assert.equal(regions(four).length,8,'four poses are printed in both matching strips');
  assert.equal(images(one).length,1);assert.equal(attr(images(one)[0],'href'),poses[0]);
  assertApprovedStripWindows(slots(four),preset.name);
  assert.deepEqual(images(four).map(tag=>attr(tag,'href')),[...poses,...poses],'each captured pose appears once per strip in capture order');
  assert.equal((four.match(/data-fpr-strip-copy="[12]"/g)||[]).length,2);
  assert.match(four,/data-fpr-sheet-photo-windows="8"/);
  const large=regions(one)[0];
  const artwork=one.match(/<rect\b(?=[^>]*data-fpr-sheet-bounds="true")[^>]*\/>/)?.[0];
  assert(artwork,'the complete approved decorative sheet has explicit bounded geometry');
  assert.deepEqual(box(artwork),{x:0,y:0,width:1200,height:1800},
   'approved decorative artwork fills the entire 4x6 sheet instead of a narrow centered strip');
  assert.match(one,/<g data-fpr-sheet-artwork="true">/);
  assert(large.width>=900,'the one-photo opening uses at least three quarters of the full sheet width');
  assert(large.width*large.height>slots(four)[0].width*slots(four)[0].height*3,'one-photo print is substantially larger than each strip window');
  const sourceCrops=[...four.matchAll(/<g\b(?=[^>]*data-fpr-decoration-source="true")[^>]*>/g)].map(match=>match[0]);
  assert(sourceCrops.length>0,'approved decorative details are retained');
  for(const tag of sourceCrops){
   const crop=attr(tag,'data-source-crop')?.split(',').map(Number);
   assert(crop?.length===4&&crop.every(Number.isFinite),'each decoration has a bounded safe source crop');
   assert(crop[2]>0&&crop[3]>0&&crop[0]>=0&&crop[1]>=0,'decoration source bounds are nonempty');
   const [x,y,w,h]=crop;
   for(const [px,py,pw,ph]of referencePhotoPanels[preset.key])assert(x+w<=px||px+pw<=x||y+h<=py||py+ph<=y,
    'decorative source crops never include any original sample photograph');
  }
  assert.match(four,/data-fpr-safe-decorations="true"/,'the strip uses safe decoration crops rather than the complete reference card with example names and faces');
  assert(four.includes('Jordan &amp; Avery'),'the strip uses the approved customer name');
  assert.match(one,/<svg[^>]*width="1200" height="1800" viewBox="0 0 1200 1800"/);
  assert(images(four).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid slice'));
  const fit=renderFprPrint({...input,cfg:{...cfg,photoFit:'fit'},layout:'photo_strip'});
  assert(images(fit).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid meet'));
 });
 test(preset.name+' samples use one or eight blank openings and incomplete four-photo sessions cannot print',()=>{
  for(const [layout,count] of [['card',1],['photo_strip',8]]){
   const svg=renderFprPrint({template:preset.id,layout,sample:true});
   assert.equal(regions(svg).length,count);assert.equal(images(svg).length,0);
   assert.match(svg,layout==='card'?/data-fpr-reference-mask="true"/:/data-fpr-safe-decorations="true"/);
  }
  for(const originals of [undefined,[],poses.slice(0,3),[...poses.slice(0,3),'https://invalid.example/person.jpg']]){
   assert.throws(()=>renderFprPrint({template:preset.id,layout:'photo_strip',poses:originals}),/captured/i);
  }
 });
}
