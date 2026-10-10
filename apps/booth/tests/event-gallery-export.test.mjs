import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32} from 'node:zlib';
import {exportPhotos} from '../app/lib/event-photo-archive.mjs';

// Read-only IndexedDB fixture: exercise the public export path without writes,
// browser dependencies, or permission to remove a customer archive.
async function withArchive(records,job){
 const original=globalThis.indexedDB;
 let closes=0;
 globalThis.indexedDB={open(name,version){
  assert.equal(name,'friendly-event-photos-v1');assert.equal(version,1);
  const db={close(){closes++;},transaction(storeName,mode){
   assert.equal(storeName,'captures');assert.equal(mode,'readonly');
   const tx={objectStore(name){
    assert.equal(name,'captures');
    return {index(indexName){
     assert.equal(indexName,'scope');
     return {getAll(scope){
      const request={result:structuredClone(records.filter(record=>record.scope===scope))};
      queueMicrotask(()=>{request.onsuccess();queueMicrotask(()=>tx.oncomplete());});
      return request;
     }};
    }};
   }};
   return tx;
  }};
  const request={result:db};queueMicrotask(()=>request.onsuccess());return request;
 }};
 try{return await job();}
 finally{
  if(original===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=original;
  assert(closes>0,'Every opened archive must close after export.');
 }
}

const jpeg=value=>new Uint8Array([255,216,255,254,0,3,value,255,217]).buffer;
function record(id,{scope='customer-event',poses=[],collage=null,keepsake=null,createdAt='2026-10-10T12:00:00.000Z',...extra}={}){
 return {key:scope+':'+id,id,scope,createdAt,revision:id+'-revision',encoding:'jpeg-arraybuffer',poses,collage,keepsake,...extra};
}
async function zipEntries(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),files=new Map();let offset=0;
 while(view.getUint32(offset,true)===0x04034b50){
  const length=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
  const name=new TextDecoder().decode(bytes.subarray(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength;
  const data=bytes.slice(start,start+length);
  assert(!files.has(name),'ZIP filenames must be unique.');
  assert.equal(crc32(data),view.getUint32(offset+14,true),'ZIP checksum must cover '+name);
  files.set(name,data);offset=start+length;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50,'Every export needs a central directory.');
 const end=bytes.length-22;
 assert.equal(view.getUint32(end,true),0x06054b50);
 assert.equal(view.getUint16(end+10,true),files.size);
 return files;
}
const manifest=files=>JSON.parse(new TextDecoder().decode(files.get('manifest.json')));
const exactBytes=(files,name,expected)=>assert.deepEqual(files.get(name),new Uint8Array(expected),'Export must preserve '+name+' byte for byte.');

test('complete event ZIP contains four originals, capture collage and finished keepsake separately',async()=>{
 const poses=[1,2,3,4].map(jpeg),collage=jpeg(5),keepsake=jpeg(6);
 const saved=record('four-pose-session',{poses,collage,keepsake});
 const before=structuredClone(saved);
 await withArchive([saved],async()=>{
  const result=await exportPhotos(saved.scope),files=await zipEntries(result.blob),details=manifest(files);
  assert.deepEqual([...files.keys()],['manifest.json','session-0001/pose-1.jpg','session-0001/pose-2.jpg','session-0001/pose-3.jpg','session-0001/pose-4.jpg','session-0001/collage.jpg','session-0001/keepsake.jpg']);
  poses.forEach((pose,index)=>exactBytes(files,'session-0001/pose-'+(index+1)+'.jpg',pose));
  exactBytes(files,'session-0001/collage.jpg',collage);exactBytes(files,'session-0001/keepsake.jpg',keepsake);
  assert.equal(details.sessions,1);assert.equal(details.originalPhotos,4);assert.equal(details.captureCollages,1);
  assert.equal(details.finishedKeepsakes,1);assert.equal(details.interruptedSessions,0);assert.equal(details.fileCount,6);
  assert.equal(result.count,1);assert.equal(result.finishedKeepsakes,1);assert.equal(result.snapshot.records.length,1);
 });
 assert.deepEqual(saved,before,'Export must leave every archived image unchanged.');
});

test('one-photo ZIP keeps separately named pose, collage and keepsake even when their bytes match',async()=>{
 const photo=jpeg(7);
 await withArchive([record('one-photo-session',{poses:[photo],collage:photo,keepsake:photo})],async()=>{
  const files=await zipEntries((await exportPhotos('customer-event')).blob);
  for(const name of ['pose-1.jpg','collage.jpg','keepsake.jpg'])exactBytes(files,'session-0001/'+name,photo);
  assert.equal(files.size,4);assert.equal(manifest(files).fileCount,3);
 });
});

test('interrupted originals and legacy collage/keepsake export without invented or cross-event photos',async()=>{
 const first=jpeg(8),second=jpeg(9),oldCollage=jpeg(10),oldKeepsake=jpeg(11);
 const records=[
  record('legacy-session',{poses:[],collage:new Blob([oldCollage],{type:'image/jpeg'}),keepsake:oldKeepsake,originalPosesUnknown:true,createdAt:'2026-10-10T12:01:00.000Z'}),
  record('interrupted-session',{poses:[first,second]}),
  record('other-customer',{scope:'another-event',poses:[jpeg(12)],collage:jpeg(13)})
 ];
 await withArchive(records,async()=>{
  const result=await exportPhotos('customer-event'),files=await zipEntries(result.blob),details=manifest(files);
  assert.deepEqual([...files.keys()],['manifest.json','session-0001/pose-1.jpg','session-0001/pose-2.jpg','session-0002/collage.jpg','session-0002/keepsake.jpg']);
  exactBytes(files,'session-0001/pose-1.jpg',first);exactBytes(files,'session-0001/pose-2.jpg',second);
  exactBytes(files,'session-0002/collage.jpg',oldCollage);exactBytes(files,'session-0002/keepsake.jpg',oldKeepsake);
  assert.equal(details.scope,'customer-event');assert.equal(details.sessions,2);assert.equal(details.originalPhotos,2);
  assert.equal(details.interruptedSessions,1);assert.equal(details.captureCollages,1);assert.equal(details.finishedKeepsakes,1);assert.equal(details.fileCount,4);
  assert.deepEqual(result.snapshot.records.map(row=>row.id),['interrupted-session','legacy-session']);
 });
});

test('empty event requires explicit export and contains only its zero-count manifest',async()=>{
 await withArchive([],async()=>{
  await assert.rejects(()=>exportPhotos('empty-event'),/No photos have been captured/);
  const result=await exportPhotos('empty-event',{allowEmpty:true}),files=await zipEntries(result.blob),details=manifest(files);
  assert.deepEqual([...files.keys()],['manifest.json']);assert.equal(details.scope,'empty-event');
  for(const name of ['sessions','originalPhotos','interruptedSessions','captureCollages','finishedKeepsakes','fileCount'])assert.equal(details[name],0);
  assert.equal(result.count,0);assert.deepEqual(result.snapshot.records,[]);
 });
});
