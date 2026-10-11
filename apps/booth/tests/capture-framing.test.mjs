import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedCaptureFrame} from '../app/lib/capture-framing.mjs';
import {FPR_PRINT_PRESETS} from '../app/lib/fpr-print-presets.mjs';
import {createCustomDesign,validateCustomDesign} from '../app/lib/custom-design.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';

const poses=[1,2,3,4].map(n=>'data:image/jpeg;base64,/9j/AA'+n+'=');
const cfgFor=template=>({guestMode:'approved',type:'graduation',defaultTemplate:template,
 title:'Taylor Celebration',date:'June 10, 2027',photoFit:'fill',details:{graduate:'Taylor',classYear:'2027'}});
const attr=(tag,name)=>tag.match(new RegExp(' '+name+'="([^"]*)"'))?.[1];
function renderedWindows(cfg){
 const svg=renderKeepsake({cfg,template:cfg.defaultTemplate,photo:poses[0],poses,layout:'photo_strip',stripMode:'single'});
 return [...svg.matchAll(/<image\b(?=[^>]*data-guest-photo="true")[^>]*\/>/g)].map(([tag])=>({
  width:Number(attr(tag,'width')),height:Number(attr(tag,'height')),pose:Number(attr(tag,'data-pose')),
  copy:Number(attr(tag,'data-copy')||1),fit:attr(tag,'preserveAspectRatio')
 }));
}
function assertMatches(frame,window,fit){
 assert.deepEqual(frame,{width:window.width,height:window.height,aspect:window.width/window.height,fit});
 assert.equal(window.fit,fit==='contain'?'xMidYMid meet':'xMidYMid slice',
  'the live framing and the finished photograph use the same fitting choice');
}

for(const template of [...FPR_PRINT_PRESETS.map(p=>p.id),'grad-gala']){
 test(template+' camera framing matches all four actual approved print apertures',()=>{
  for(const photoFit of ['fill','fit']){
   const cfg={...cfgFor(template),photoFit},windows=renderedWindows(cfg);
   assert.equal(windows.length,4);
   for(let pose=1;pose<=4;pose++){
    const frame=approvedCaptureFrame(cfg,pose,4);
    assert.equal(frame.aspect,552/650,'the preview uses the large portrait photograph, not the previous strip crop');
    assertMatches(frame,windows[pose-1],photoFit==='fit'?'contain':'cover');
   }
  }
 });
}

test('custom camera framing follows the current pose when approved openings have different proportions',()=>{
 const customDesign=createCustomDesign();
 customDesign.layouts.four.rects=[
  {x:4,y:12,w:38,h:28},{x:55,y:14,w:35,h:22},
  {x:8,y:52,w:30,h:34},{x:51,y:49,w:43,h:37}
 ];
 validateCustomDesign(customDesign);
 for(const photoFit of ['fill','fit']){
  const cfg={...cfgFor('custom'),customDesign,photoFit},before=JSON.stringify(cfg),windows=renderedWindows(cfg);
  assert.equal(new Set(windows.map(w=>w.width/w.height)).size,4);
  for(let pose=1;pose<=4;pose++){
   const rect=customDesign.layouts.four.rects[pose-1],frame=approvedCaptureFrame(cfg,pose,4);
   assert.equal(frame.aspect,(rect.w*1200)/(rect.h*1800));
   assertMatches(frame,windows[pose-1],photoFit==='fit'?'contain':'cover');
  }
  assert.equal(JSON.stringify(cfg),before,'framing never changes the approved customer artwork');
 }
});

test('saved two-copy custom artwork keeps its original per-pose camera geometry',()=>{
 const customDesign=createCustomDesign();
 customDesign.layouts.four.copies=2;
 customDesign.layouts.four.rects=[
  {x:2,y:6,w:44,h:18},{x:3,y:27,w:42,h:17},
  {x:4,y:48,w:38,h:16},{x:2,y:69,w:46,h:14}
 ];
 validateCustomDesign(customDesign);
 const cfg={...cfgFor('custom'),customDesign},before=JSON.stringify(cfg),windows=renderedWindows(cfg);
 assert.equal(windows.length,8,'previously approved matching strips retain their two copies');
 for(let pose=1;pose<=4;pose++){
  const frame=approvedCaptureFrame(cfg,pose,4);
  for(const window of windows.filter(window=>window.pose===pose))assertMatches(frame,window,'cover');
 }
 assert.equal(JSON.stringify(cfg),before,'the old strip coordinates and copy setting remain intact');
});

test('custom pose selection is bounded to the first or last approved aperture',()=>{
 const customDesign=createCustomDesign();
 customDesign.layouts.four.rects=[
  {x:4,y:12,w:38,h:28},{x:55,y:14,w:35,h:22},
  {x:8,y:52,w:30,h:34},{x:51,y:49,w:43,h:37}
 ];
 const cfg={...cfgFor('custom'),customDesign};
 for(const current of [undefined,0,-5,NaN,'bad'])assert.deepEqual(approvedCaptureFrame(cfg,current),approvedCaptureFrame(cfg,1));
 assert.deepEqual(approvedCaptureFrame(cfg,'2.9'),approvedCaptureFrame(cfg,2));
 for(const current of [5,99,Infinity])assert.deepEqual(approvedCaptureFrame(cfg,current),approvedCaptureFrame(cfg,4));
});

test('camera crop guidance is absent outside approved four-photo sessions',()=>{
 assert.equal(approvedCaptureFrame(),null);
 for(const guestMode of [undefined,'demo','legacy'])assert.equal(approvedCaptureFrame({...cfgFor('fpr-wedding'),guestMode}),null);
 for(const total of [0,1,3,5,'4'])assert.equal(approvedCaptureFrame(cfgFor('fpr-wedding'),1,total),null);
 for(const template of ['ivory','unsupported',undefined])assert.equal(approvedCaptureFrame(cfgFor(template)),null);
});

test('missing or unusable custom aperture dimensions do not create a misleading camera crop',()=>{
 assert.equal(approvedCaptureFrame(cfgFor('custom')),null);
 for(const rect of [undefined,null,{w:0,h:20},{w:20,h:-1},{w:NaN,h:20},
  {w:20,h:Infinity},{w:'20',h:20},{w:20}]){
  const customDesign=createCustomDesign();customDesign.layouts.four.rects[0]=rect;
  assert.equal(approvedCaptureFrame({...cfgFor('custom'),customDesign},1),null);
 }
});
