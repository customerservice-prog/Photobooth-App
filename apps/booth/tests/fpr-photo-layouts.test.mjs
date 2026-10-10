import test from 'node:test';
import assert from 'node:assert/strict';
import {FPR_PRINT_PRESETS} from '../app/lib/fpr-print-presets.mjs';
import {renderFprPrint} from '../app/lib/fpr-print-renderer.mjs';

const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];
const box=tag=>Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(attr(tag,key))]));
const images=svg=>Array.from(svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g),match=>match[0]);
const regions=svg=>Array.from(svg.matchAll(/<g data-approved-photo-region="true"[^>]*>(<rect\b[^>]*\/>)/g),match=>box(match[1]));
function photoArea(svg){
 const start=svg.indexOf('<g data-fpr-preset-photo-areas=');
 assert(start>=0);
 const tags=/<\/?g\b[^>]*>/g;tags.lastIndex=start;
 let depth=0,match;
 while((match=tags.exec(svg))){
  depth+=match[0].startsWith('</')?-1:1;
  if(depth===0)return {inside:svg.slice(start,tags.lastIndex),outside:svg.slice(0,start)+svg.slice(tags.lastIndex)};
 }
 assert.fail('photo area must be a complete SVG group');
}
const close=(actual,expected)=>assert(Math.abs(actual-expected)<=.03,`${actual} must equal ${expected} within SVG rounding`);

for(const preset of FPR_PRINT_PRESETS){
 test(preset.name+' has one large photograph or four equal separate photographs with identical approved artwork',()=>{
  const cfg={approvedPrintName:'Jordan & Avery',date:'June 10, 2027',details:{classYear:'2027'}};
  const input={template:preset.id,cfg,photo:poses[0],poses,id:'proof'};
  const one=renderFprPrint({...input,layout:'card'}),four=renderFprPrint({...input,layout:'photo_strip'});
  assert.equal(regions(one).length,1,'one-photo layout must never repeat the image in old reference openings');
  assert.equal(regions(four).length,4,'each four-photo pose has its own opening');
  assert.equal(images(one).length,1);assert.equal(attr(images(one)[0],'href'),poses[0]);
  assert.equal(images(four).length,4);
  assert.deepEqual(images(four).map(tag=>attr(tag,'href')),poses,'each captured pose appears once in capture order');
  assert.deepEqual(images(four).map(tag=>attr(tag,'data-pose')),['1','2','3','4']);
  const large=regions(one)[0],small=regions(four);
  for(let n=0;n<small.length;n++){
   close(small[n].x,large.x);close(small[n].width,large.width);close(small[n].height,small[0].height);
   assert(small[n].height<large.height/3,'the full-size photograph is clearly larger than each strip frame');
   if(n)assert(small[n].y>small[n-1].y+small[n-1].height,'rows have visible empty gutters');
  }
  close(small[0].y,large.y);close(small[3].y+small[3].height,large.y+large.height);
  const oneArea=photoArea(one),fourArea=photoArea(four);
  assert.equal(oneArea.outside.replace('data-layout="card"','data-layout="photo_strip"'),fourArea.outside,
   'event text, date, decorative artwork and paper size do not change between layouts');
  const mask=box(fourArea.inside.match(/<rect\b(?=[^>]*data-fpr-reference-mask="true")[^>]*\/>/)[0]);
  assert(mask.x<large.x&&mask.y<large.y&&mask.x+mask.width>large.x+large.width&&mask.y+mask.height>large.y+large.height,
   'opaque mask covers the entire old photograph zone, every new gutter and antialiased reference edges');
  assert(fourArea.inside.indexOf('data-fpr-reference-mask')<fourArea.inside.indexOf('data-approved-photo-region'),
   'reference faces are hidden before the new photos are drawn');
  assert.match(one,/<svg[^>]*width="1200" height="1800" viewBox="0 0 1200 1800"/);
  assert(images(four).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid slice'));
  const fit=renderFprPrint({...input,cfg:{...cfg,photoFit:'fit'},layout:'photo_strip'});
  assert(images(fit).every(tag=>attr(tag,'preserveAspectRatio')==='xMidYMid meet'));
 });
 test(preset.name+' samples use one or four blank openings and incomplete four-photo sessions cannot print',()=>{
  for(const [layout,count] of [['card',1],['photo_strip',4]]){
   const svg=renderFprPrint({template:preset.id,layout,sample:true});
   assert.equal(regions(svg).length,count);assert.equal(images(svg).length,0);
   assert.match(svg,/data-fpr-reference-mask="true"/);
  }
  for(const originals of [undefined,[],poses.slice(0,3),[...poses.slice(0,3),'https://invalid.example/person.jpg']]){
   assert.throws(()=>renderFprPrint({template:preset.id,layout:'photo_strip',poses:originals}),/captured/i);
  }
 });
}
