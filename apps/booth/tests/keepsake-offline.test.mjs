import test from 'node:test';
import assert from 'node:assert/strict';
import {makeKeepsakeExport} from '../app/lib/keepsake-export.mjs';

const input={photo:'data:image/jpeg;base64,/9j/2Q==',cfg:{type:'other',title:'Zoë & 欢',date:'October 9, 2026',guestMode:'approved'},layout:'card',template:'champagne',filter:'none'};
async function browserFixture(options,job){
 const saved=[],sources=[],created=[],revoked=[],serialized=[],drawn=[],timers=[];
 const replace=(target,key,value)=>{saved.push({target,key,descriptor:Object.getOwnPropertyDescriptor(target,key)});Object.defineProperty(target,key,{configurable:true,writable:true,value});};
 const canvas={width:0,height:0,getContext:()=>({fillRect(){},drawImage:image=>drawn.push(image.src)}),toBlob:callback=>callback(new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'}))};
 class Image{
  set src(value){this.value=value;sources.push(value);if(!value||options.hang)return;queueMicrotask(()=>{if(value.startsWith('blob:')&&options.failBlob||value.startsWith('data:image/svg+xml')&&options.failData)this.onerror?.();else this.onload?.();});}
  get src(){return this.value;}
 }
 class FileReader{
  readAsDataURL(blob){serialized.push(blob);blob.arrayBuffer().then(buffer=>{this.result='data:'+blob.type+';base64,'+Buffer.from(buffer).toString('base64');this.onload?.();},error=>{this.error=error;this.onerror?.();});}
 }
 try{
  replace(globalThis,'Image',Image);replace(globalThis,'FileReader',FileReader);replace(globalThis,'document',{createElement:()=>canvas});
  replace(URL,'createObjectURL',blob=>{created.push(blob);return 'blob:fixture-svg';});replace(URL,'revokeObjectURL',url=>revoked.push(url));
  if(options.hang){replace(globalThis,'setTimeout',(callback,milliseconds)=>{const timer={callback,milliseconds,cleared:false};timers.push(timer);return timer;});replace(globalThis,'clearTimeout',timer=>{timer.cleared=true;});}
  await job({sources,created,revoked,serialized,drawn,timers,canvas});
 }finally{for(const {target,key,descriptor} of saved.reverse()){if(descriptor)Object.defineProperty(target,key,descriptor);else delete target[key];}}
}

test('normal SVG export uses the Blob image and releases its URL and canvas',async()=>{
 await browserFixture({},async state=>{
  const artifact=await makeKeepsakeExport(input);
  assert.deepEqual(state.sources,['blob:fixture-svg']);assert.deepEqual(state.drawn,['blob:fixture-svg']);
  assert.equal(state.serialized.filter(blob=>blob.type.startsWith('image/svg+xml')).length,0);
  assert.deepEqual(state.revoked,['blob:fixture-svg']);assert.equal(state.canvas.width,0);assert.equal(state.canvas.height,0);
  assert.equal(artifact.width,1200);assert.equal(artifact.height,1800);assert.equal(artifact.blob.type,'image/jpeg');
 });
});
test('a Blob image load error retries the identical SVG bytes locally and preserves Unicode and output',async()=>{
 await browserFixture({failBlob:true},async state=>{
  const artifact=await makeKeepsakeExport(input);
  assert.equal(state.sources.length,2);assert.match(state.sources[1],/^data:image\/svg\+xml;charset=utf-8;base64,/);
  const decoded=Buffer.from(state.sources[1].split(',')[1],'base64');
  assert.deepEqual(decoded,Buffer.from(await state.created[0].arrayBuffer()));
  assert.match(decoded.toString('utf8'),/Zoë &amp; 欢/);assert(decoded.toString('utf8').includes(input.photo));
  assert.equal(state.serialized[0],state.created[0]);assert.deepEqual(state.drawn,[state.sources[1]]);
  assert.deepEqual(new Uint8Array(await artifact.blob.arrayBuffer()),new Uint8Array([255,216,255,217]));
  assert.equal(artifact.width,1200);assert.equal(artifact.height,1800);assert.deepEqual(state.revoked,['blob:fixture-svg']);
  assert.equal(state.canvas.width,0);assert.equal(state.canvas.height,0);
 });
});
test('an SVG image timeout does not retry and still releases the image URL and canvas',async()=>{
 await browserFixture({hang:true},async state=>{
  const pending=makeKeepsakeExport(input);
  assert.equal(state.timers.length,1);assert.equal(state.timers[0].milliseconds,15000);
  state.timers[0].callback();await assert.rejects(pending,/Photo preparation timed out/);
  assert.deepEqual(state.sources,['blob:fixture-svg','']);assert.equal(state.serialized.length,0);
  assert.equal(state.timers[0].cleared,true);assert.deepEqual(state.revoked,['blob:fixture-svg']);
  assert.equal(state.canvas.width,0);assert.equal(state.canvas.height,0);
 });
});
test('a failed local SVG fallback reports the error and cleans up without drawing or encoding a replacement',async()=>{
 await browserFixture({failBlob:true,failData:true},async state=>{
  await assert.rejects(()=>makeKeepsakeExport(input),error=>error.code==='KEEPSAKE_IMAGE_LOAD_FAILED');
  assert.equal(state.sources.length,2);assert.deepEqual(state.drawn,[]);assert.deepEqual(state.revoked,['blob:fixture-svg']);
  assert.equal(state.canvas.width,0);assert.equal(state.canvas.height,0);
 });
});
