import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizePrintLayouts,validatePrintLayouts,hasOriginalPoses,initialPrintLayout,STRIP_DESIGNS} from '../app/lib/print-layouts.mjs';
import {renderKeepsake} from '../app/lib/keepsake-designs.mjs';
import {stripPhotoCells} from '../app/lib/classic-photo-strip.mjs';
import {exportKey} from '../app/lib/keepsake-export.mjs';
import {octoberPreset,validatePreparation,portableSettings,importSettings} from '../app/lib/event-workspace.mjs';
import {finalizeEventSetup} from '../app/lib/event-config.mjs';
const poses=['AAAA','BBBB','CCCC','DDDD'].map(v=>'data:image/jpeg;base64,'+v);
const cfg=octoberPreset();
const strip=(overrides={})=>renderKeepsake({photo:poses[0],poses,layout:'photo_strip',cfg,template:'champagne',id:'test-strip',...overrides});
test('new and unconfigured events start with one centered strip',()=>assert.deepEqual(normalizePrintLayouts(),{cardEnabled:true,stripEnabled:true,defaultLayout:'card',stripMode:'single',useEventColors:true,stripHeadline:'A MOMENT TO KEEP',footerText:'',showCutGuide:true}));
test('turning off a layout resolves defaults to the remaining enabled layout',()=>{assert.equal(normalizePrintLayouts({cardEnabled:false}).defaultLayout,'photo_strip');assert.equal(normalizePrintLayouts({defaultLayout:'photo_strip',stripEnabled:false}).defaultLayout,'card');assert.throws(()=>validatePrintLayouts({cardEnabled:false,stripEnabled:false}));});
test('saved layout input is bounded and never accepts unknown output identifiers',()=>{const result=normalizePrintLayouts({defaultLayout:'//bad.example',stripMode:'many',footerText:'a'.repeat(999),useEventColors:false});assert.equal(result.defaultLayout,'card');assert.equal(result.stripMode,'single');assert.equal(normalizePrintLayouts({stripMode:'double'}).stripMode,'double');assert.equal(result.footerText.length,80);assert.equal(result.useEventColors,false);});
test('strip headline and footer stay editable and are trimmed only when saved',()=>{assert.equal(normalizePrintLayouts({footerText:'Happy ',stripHeadline:' Smile big '}).footerText,'Happy ');assert.equal(normalizePrintLayouts({stripHeadline:' Smile big '}).stripHeadline,' Smile big ');const saved=validatePrintLayouts({footerText:' Happy party ',stripHeadline:' Smile big '});assert.equal(saved.footerText,'Happy party');assert.equal(saved.stripHeadline,'Smile big');assert.equal(validatePrintLayouts({stripHeadline:'   '}).stripHeadline,'A MOMENT TO KEEP');});
test('strip layout requires every original pose and handles legacy saved cards honestly',()=>{assert.equal(hasOriginalPoses(poses,4),true);assert.equal(hasOriginalPoses([poses[0]],4),false);assert.equal(initialPrintLayout({defaultLayout:'photo_strip'},[],4),'card');assert.equal(initialPrintLayout({cardEnabled:false},[],4),'photo_strip');assert.throws(()=>strip({poses:[]}));assert.throws(()=>strip({poses:poses.slice(0,3)}));assert.throws(()=>strip({poses:[...poses,'data:image/jpeg;base64,AAAA']}));});
test('optional double strips have eight photo slots in two columns and a cut guide',()=>{const svg=strip({stripMode:'double'});assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,8);assert.equal((svg.match(/data-strip-copy=/g)||[]).length,2);assert.match(svg,/translate\(0 0\)/);assert.match(svg,/translate\(600 0\)/);assert.match(svg,/viewBox="0 0 1200 1800"/);assert.match(svg,/data-cut-guide="true"/);assert.equal((svg.match(/CUT HERE/g)||[]).length,2);});
test('each column contains the same four originals in chronological order',()=>{const images=[...strip({stripMode:'double'}).matchAll(/data-pose="(\d)" href="([^"]+)"/g)];assert.deepEqual(images.map(m=>Number(m[1])),[1,2,3,4,1,2,3,4]);assert.deepEqual(images.map(m=>m[2]),[...poses,...poses]);});
test('single strip uses four originals centered on the same 4x6 sheet',()=>{const svg=strip({stripMode:'single'});assert.equal((svg.match(/data-guest-photo=/g)||[]).length,4);assert.match(svg,/translate\(300 0\)/);assert.doesNotMatch(svg,/data-cut-guide|CUT HERE/);assert.match(svg,/width="1200" height="1800"/);});
test('staff can hide the center cut guide without changing the double-strip sheet',()=>{const svg=strip({stripMode:'double',cfg:{...cfg,printLayouts:{showCutGuide:false}}});assert.equal((svg.match(/data-strip-copy=/g)||[]).length,2);assert.doesNotMatch(svg,/data-cut-guide|CUT HERE/);});
test('custom strip headline is escaped and rendered across both copies',()=>{const svg=strip({stripMode:'double',cfg:{...cfg,printLayouts:{stripHeadline:'Smile & celebrate'}}});assert((svg.match(/Smile &amp; celebrate/g)||[]).length>=2);assert.equal((svg.match(/data-strip-copy=/g)||[]).length,2);assert.doesNotMatch(strip({stripMode:'double',cfg:{...cfg,printLayouts:{stripHeadline:'<script>bad</script>'}}}),/<script>/);});
test('three-pose setting makes three poses per strip without duplicate filler',()=>{const svg=strip({stripMode:'double',poses:poses.slice(0,3),cfg:{...cfg,printPackage:{...cfg.printPackage,shotsPerSession:3}}});assert.equal((svg.match(/data-guest-photo=/g)||[]).length,6);assert.doesNotMatch(svg,/data-pose="4"/);});
test('all photo cells stay inside strip slots and fill them unless whole-photo mode is selected',()=>{
 for(const n of [3,4]){
  const cells=stripPhotoCells(n);
  for(let i=0;i<n;i++){
   const c=cells[i];assert(c.x>=36&&c.x+c.w<=564&&c.y>=220&&c.y+c.h<=1470);
   if(i)assert(c.y>cells[i-1].y+cells[i-1].h);
  }
 }
 const single=strip(),double=strip({stripMode:'double'});
 assert.equal((single.match(/preserveAspectRatio="xMidYMid slice"/g)||[]).length,4);
 assert.equal((double.match(/preserveAspectRatio="xMidYMid slice"/g)||[]).length,8);
 assert.equal((strip({cfg:{...cfg,photoFit:'fit'}}).match(/preserveAspectRatio="xMidYMid meet"/g)||[]).length,4);
 assert.equal((single.match(/data-strip-copy=/g)||[]).length,1);
});
test('three distinct strip styles include names, date and custom party footer',()=>{const outputs=STRIP_DESIGNS.map(d=>strip({template:d.id,cfg:{...cfg,title:'Taylor & Friends',details:{...cfg.details,eventName:'Taylor & Friends'},printLayouts:{footerText:'Birthday memories'}}}));assert.equal(new Set(outputs).size,3);for(const svg of outputs){assert.match(svg,/Taylor &amp; Friends/);assert.match(svg,/Birthday memories/);assert.match(svg,/October 10, 2026/);}});
test('custom colors are validated and a neutral strip option ignores party colors',()=>{const custom={...cfg,details:{...cfg.details,primaryColor:'#884477',secondaryColor:'#eecc99'}};assert.match(strip({cfg:custom}),/#884477/);assert.doesNotMatch(strip({cfg:{...custom,printLayouts:{useEventColors:false}}}),/#884477/);assert.doesNotMatch(strip({cfg:{...custom,details:{...custom.details,primaryColor:'url(https://bad.test)'}}}),/bad.test/);});
test('strip names, captions and original-image inputs cannot inject SVG',()=>{const evil={...cfg,title:'<script>alert(1)</script>',details:{...cfg.details,eventName:'<script>alert(1)</script>'},printLayouts:{footerText:'<foreignObject>bad</foreignObject>'}};assert.doesNotMatch(strip({cfg:evil}),/<script|<foreignObject/);assert.throws(()=>strip({poses:[poses[0],poses[1],poses[2],'https://bad.test/photo.jpg']}));});
test('filters affect every original photo but never the strip artwork',()=>{const svg=strip({filter:'grayscale(1) contrast(1.08) brightness(1.04)'});assert.equal((svg.match(/data-photo-finish="bw"/g)||[]).length,4);assert.match(svg,/feColorMatrix/);assert.doesNotMatch(svg,/<g[^>]*filter=/);});
test('strip samples must be explicitly requested and are never export substitutes',()=>{assert.throws(()=>strip({poses:undefined}));const svg=strip({poses:undefined,sample:true});assert.match(svg,/YOUR POSE/);assert.doesNotMatch(svg,/data-guest-photo/);});
test('export identity changes with format, strip arrangement or any original pose',()=>{const input={photo:poses[0],poses,cfg,layout:'card',stripMode:'double'};for(const change of [{layout:'photo_strip'},{stripMode:'single'},{poses:[...poses.slice(0,3),poses[0]]}])assert.notEqual(exportKey(input),exportKey({...input,...change}));});
test('October backups preserve layout settings and never add counters or photos',()=>{const configured=validatePreparation({...cfg,printLayouts:{cardEnabled:false,defaultLayout:'photo_strip',stripMode:'single',footerText:'Have fun',useEventColors:false}});const imported=importSettings(portableSettings(configured));assert.deepEqual(imported.printLayouts,configured.printLayouts);assert.equal(imported.printPackage.includedPrints+imported.printPackage.addOnPrints,216);assert.doesNotMatch(portableSettings(configured),/poses|liveUsage|demoUsage/);});
test('general event setup persists selected strip layout without changing allowance',()=>{const event={...cfg,printLayouts:{cardEnabled:false,defaultLayout:'photo_strip'},details:{...cfg.details,eventName:'Office party'}};const saved=finalizeEventSetup(event);assert.equal(saved.printLayouts.defaultLayout,'photo_strip');assert.deepEqual(saved.printPackage,event.printPackage);});
test('print gallery, print-only card and digital export receive the selected layout and raw poses',async()=>{const source=await readFile(new URL('../app/components/PhotoPreview.js',import.meta.url),'utf8');assert.match(source,/input=\{photo,poses,layout,stripMode/);assert.match(source,/photoPane ksPrintOnly/);assert.match(source,/poses=\{poses\} layout=\{layout\} stripMode=\{stripMode\}/);assert.match(source,/if\(!busy&&!printed/);assert.match(source,/disabled=\{busy\|\|printed\}/);});
test('new captures carry all raw poses into preview and clear them between sessions',async()=>{const source=await readFile(new URL('../app/page.js',import.meta.url),'utf8');assert.match(source,/setPoses\(shots\);setPhoto\(data\)/);assert.match(source,/<PhotoPreview photo=\{photo\} poses=\{poses\}/);assert.match(source,/setPhoto\(null\);setPoses\(\[\]\)/);});

test('choosing two strips remains available, preserves original order and uses one 4x6 sheet',()=>{
 const single=strip(),double=strip({stripMode:'double'});
 assert.match(single,/data-strip-mode="single"/);
 assert.match(double,/data-strip-mode="double"/);
 assert.equal((single.match(/data-guest-photo="true"/g)||[]).length,4);
 assert.equal((double.match(/data-guest-photo="true"/g)||[]).length,8);
 assert.match(single,/width="1200" height="1800"/);
 assert.match(double,/width="1200" height="1800"/);
 assert.deepEqual([...double.matchAll(/data-pose="(\d)"/g)].map(m=>m[1]),['1','2','3','4','1','2','3','4']);
});
