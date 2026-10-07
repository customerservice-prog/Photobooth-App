import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BOOTH_RELEASE,freshBoothEntry} from '../app/lib/booth-launch.mjs';
import {validateShotSet,fitPose,photoStripCells} from '../app/lib/photo-strip.mjs';
const photo='data:image/jpeg;base64,aGVsbG8=';

test('demo entry carries the event and demo scope and a fresh document version',()=>{
 const u=new URL(freshBoothEntry('demo',123),'https://booth.example');
 assert.equal(u.pathname,'/');assert.equal(u.searchParams.get('event'),'oct10-2026');assert.equal(u.searchParams.get('demo'),'1');assert.equal(u.searchParams.get('boothv'),BOOTH_RELEASE);assert.equal(u.searchParams.get('refresh'),'123');
});
test('reloading general saved booth does not turn it into a different event',()=>{
 const u=new URL(freshBoothEntry('saved',123),'https://booth.example');assert.equal(u.pathname,'/');assert.equal(u.searchParams.has('event'),false);assert.equal(u.searchParams.has('demo'),false);
});
test('only named local entry routes are accepted',()=>{
 for(const name of ['https://evil.test','//evil.test','__proto__','constructor','../../'])assert.throws(()=>freshBoothEntry(name,123));
 for(const time of [NaN,-1,Infinity,'123',1.2])assert.throws(()=>freshBoothEntry('demo',time));
});
test('installed identity is kept while start URL stops selecting an old wedding',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.id,'/bryan-wedding');assert.equal(manifest.start_url,'/launch');
});
test('legacy and recovery pages are dynamic and never seed or erase browser storage',async()=>{
 for(const path of ['bryan-wedding/page.js','launch/page.js','ipad/page.js','components/BoothLauncher.js']){
  const text=await readFile(new URL('../app/'+path,import.meta.url),'utf8');assert.doesNotMatch(text,/setItem\s*\(|removeItem\s*\(|\.clear\s*\(|deleteDatabase\s*\(/);if(path.endsWith('page.js'))assert.match(text,/dynamic='force-dynamic'/);
 }
});
test('all configured shots must be present, with no truncation or filler',()=>{
 assert.equal(validateShotSet([photo,photo,photo,photo],4).length,4);assert.throws(()=>validateShotSet([photo,photo,photo],4));assert.throws(()=>validateShotSet(Array(4),4));assert.throws(()=>validateShotSet(Array(5).fill(photo),4));
});
test('corrupt or remote photo references cannot be silently discarded',()=>{
 for(const bad of [null,undefined,'https://example.test/p.jpg','data:image/svg+xml;base64,PHN2Zz4=','data:image/jpeg;base64,'])assert.throws(()=>validateShotSet([photo,photo,bad],3));
});
test('holding still may produce identical photos; that is not a failed session',()=>{
 assert.deepEqual(validateShotSet([photo,photo,photo],3),[photo,photo,photo]);
});
test('wide and tall camera poses are fitted without throwing away edge pixels',()=>{
 for(const [width,height] of [[1920,1080],[1080,1920],[640,480],[800,200],[200,800]])for(const cell of photoStripCells(4)){
  const r=fitPose(width,height,cell);assert(r.x>=cell.x&&r.y>=cell.y);assert(r.x+r.w<=cell.x+cell.w+0.001);assert(r.y+r.h<=cell.y+cell.h+0.001);assert(Math.abs(r.w/r.h-width/height)<0.001);
 }
});
test('three- and four-pose layouts have separate cells inside the canvas',()=>{
 for(const total of [3,4]){const cells=photoStripCells(total);assert.equal(cells.length,total);for(const c of cells){assert(c.x>=0&&c.y>=0&&c.x+c.w<=1200&&c.y+c.h<=1200);}for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){const a=cells[i],b=cells[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}}
});
test('invalid image dimensions are rejected',()=>{
 for(const dims of [[0,100],[100,0],[-1,100],[NaN,100],[Infinity,100]])assert.throws(()=>fitPose(...dims,{x:0,y:0,w:500,h:500}));
});
test('compositor uses the entire source rectangle for each original photo',async()=>{
 const text=await readFile(new URL('../app/lib/photo-strip.mjs',import.meta.url),'utf8');assert.match(text,/drawImage\(image,0,0,width,height,dest\.x,dest\.y,dest\.w,dest\.h\)/);assert.doesNotMatch(text,/\.filter\(|\.slice\(0,4\)|drawCover/);
});
