import test from 'node:test';
import assert from 'node:assert/strict';
import {GALLERY_KINDS,GALLERY_PART_SIZE,GALLERY_PART_MAX_FILES,GALLERY_PART_MAX_BYTES,GALLERY_IMAGE_MAX_BYTES,galleryPartSize,galleryFiles,zipJpegs,readEventGalleryPart} from '../lib/event-gallery-zip.mjs';

const image=n=>new Uint8Array([255,216,n,42,255,217]);
const row=(capture_id,kind,n=1)=>({capture_id,kind,image:image(n)});
const options={eventName:'Example event',eventId:'event-example',part:1,exportedAt:'2026-10-09T12:00:00.000Z'};
async function unzipStored(blob){
 const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),files=new Map();
 for(let offset=0;view.getUint32(offset,true)===0x04034b50;){
  assert.equal(view.getUint16(offset+8,true),0,'event photos must not be recompressed');
  const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
  const start=offset+30+nameLength+extra,name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLength));
  assert(!files.has(name));files.set(name,bytes.slice(start,start+size));offset=start+size;
 }
 return files;
}
test('one and four photo sessions export every original plus both finished images byte exactly',async()=>{
 const rows=[row('capture-one','pose-1',1),row('capture-one','keepsake',2),
  ...GALLERY_KINDS.map((kind,i)=>row('capture-four',kind,i+10)),row('capture-interrupted','pose-1',20)];
 const files=galleryFiles(rows,options),archive=await unzipStored(zipJpegs(files));
 assert.equal(archive.size,10);
 const manifest=JSON.parse(new TextDecoder().decode(archive.get('manifest.json')));
 assert.equal(manifest.sessionCount,3);assert.equal(manifest.originalPhotoCount,6);assert.equal(manifest.finishedPhotoCount,3);assert.equal(manifest.fileCount,9);
 assert.deepEqual(manifest.sessions.map(session=>session.captureId),['capture-one','capture-four','capture-interrupted']);
 assert.match(manifest.note,/Photos still queued on an offline iPad are not in this download/);
 for(let i=0;i<rows.length;i++)assert.deepEqual(archive.get(files[i+1].name),rows[i].image);
 assert(archive.has('session-0002/collage.jpg'));assert(archive.has('session-0002/keepsake.jpg'));assert(archive.has('session-0003/pose-1.jpg'));
});
test('50 full sessions fit 301 ZIP entries and the next part uses distinct session folders',async()=>{
 const rows=Array.from({length:GALLERY_PART_SIZE},(_,i)=>GALLERY_KINDS.map((kind,k)=>row('capture-'+String(i).padStart(3,'0'),kind,k))).flat();
 const archive=await unzipStored(zipJpegs(galleryFiles(rows,options)));
 assert.equal(archive.size,GALLERY_PART_MAX_FILES);assert.equal(archive.size,301);
 assert(archive.has('session-0050/keepsake.jpg'));
 const next=galleryFiles([row('capture-next','pose-1')],{...options,part:2});
 assert.equal(next[1].name,'session-0051/pose-1.jpg');
 assert.throws(()=>galleryFiles([...rows,row('capture-next','pose-1')],options),/Too many photo sessions/);
 assert.throws(()=>zipJpegs(Array.from({length:302},(_,i)=>({name:'photo-'+i+'.jpg',data:image(1)}))),/50 photo sessions/);
});
test('full capture IDs survive in the manifest without filename collisions',()=>{
 const prefix='capture-'+'x'.repeat(60),rows=[row(prefix+'a','keepsake'),row(prefix+'b','keepsake')],files=galleryFiles(rows,options);
 assert.notEqual(files[1].name,files[2].name);
 const manifest=JSON.parse(new TextDecoder().decode(files[0].data));
 assert.deepEqual(manifest.sessions.map(session=>session.captureId),[prefix+'a',prefix+'b']);
});
test('bad JPEGs, unsafe names, duplicate files, unknown kinds and missing bytes cannot produce a ZIP',()=>{
 for(const data of [new Uint8Array(),new Uint8Array([1,2,3,4]),new Uint8Array([255,216,1,2])])assert.throws(()=>zipJpegs([{name:'image.jpg',data}]),/Invalid file|valid JPEG/);
 for(const name of ['../image.jpg','/image.jpg','folder//image.jpg','other.json'])assert.throws(()=>zipJpegs([{name,data:image(1)}]));
 assert.throws(()=>zipJpegs([{name:'image.jpg',data:[255,216,255,217]}]),/Invalid file/);
 assert.throws(()=>zipJpegs([{name:'same.jpg',data:image(1)},{name:'same.jpg',data:image(2)}]),/Invalid file/);
 assert.throws(()=>galleryFiles([row('capture-a','pose-5')],options),/Invalid photo/);
 assert.throws(()=>galleryFiles([row('capture-a','pose-1'),row('capture-a','pose-1')],options),/Duplicate photo/);
 assert.throws(()=>galleryFiles([{capture_id:'capture-a',kind:'pose-1',image:null}],options),/too large or has an unavailable photo/);
});
test('ZIP size ceiling accounts for headers as well as image data',()=>{
 const data=new Uint8Array(GALLERY_PART_MAX_BYTES);data.set([255,216]);data.set([255,217],data.length-2);
 assert.throws(()=>zipJpegs([{name:'photo.jpg',data}]),/too large/);
 assert(GALLERY_IMAGE_MAX_BYTES<GALLERY_PART_MAX_BYTES,'query must leave bounded room for metadata and headers');
});
test('large original photos automatically reduce sessions per part without separating their files',()=>{
 assert.equal(galleryPartSize(),50);assert.equal(galleryPartSize(1),50);
 const maximumSession=6*3*1024*1024,partSize=galleryPartSize(maximumSession);
 assert.equal(partSize,6);assert(partSize*maximumSession<=GALLERY_IMAGE_MAX_BYTES);
 assert((partSize+1)*maximumSession>GALLERY_IMAGE_MAX_BYTES);
 const files=galleryFiles(GALLERY_KINDS.map(kind=>row('capture-large',kind)),{...options,part:2,partSize});
 assert.equal(files[1].name,'session-0007/pose-1.jpg');assert.equal(files.at(-1).name,'session-0007/keepsake.jpg');
 assert.equal(galleryPartSize(GALLERY_IMAGE_MAX_BYTES),1);
 assert.throws(()=>galleryFiles([row('capture-a','pose-1'),row('capture-b','pose-1')],{...options,partSize:1}),/Too many/);
});
test('gallery SQL selects whole event sessions before joining all kinds, expiry scoped on both sides',async()=>{
 let calls=0;
 const db={$queryRaw:async(strings,...values)=>{
  calls++;const sql=strings.join('?');
  assert.deepEqual(values,['event-example',50,GALLERY_IMAGE_MAX_BYTES,1,'event-example',GALLERY_IMAGE_MAX_BYTES]);
  assert.match(sql,/FROM session_sizes ORDER BY first_uploaded_at ASC,capture_id ASC\s+LIMIT \(SELECT part_size FROM part_settings\) OFFSET/);
  assert.match(sql,/FLOOR\(\?::numeric\/NULLIF\(MAX\(session_bytes\),0\)\)\)/);
  assert.match(sql,/JOIN selected_sessions ON selected_sessions\.capture_id=images\.capture_id/);
  assert.match(sql,/WHERE event_id=\? AND expires_at>now\(\)/);
  assert.match(sql,/WHERE images\.event_id=\? AND images\.expires_at>now\(\)/);
  assert.equal(sql.match(/'pose-1','pose-2','pose-3','pose-4','collage','keepsake'/g).length,2);
  assert.match(sql,/CASE WHEN total_bytes<=\? THEN image ELSE NULL END/);
  assert.doesNotMatch(sql,/ROW_NUMBER|rank=1|\b(?:INSERT|DELETE|UPDATE|CREATE|DROP)\b/i);
  return [row('capture-051','pose-1')];
 }};
 assert.deepEqual(await readEventGalleryPart(db,'event-example',2),[row('capture-051','pose-1')]);assert.equal(calls,1);
 for(const [id,part] of [['../unsafe',1],['event-example',0],['event-example',1.5],['event-example',1001]])await assert.rejects(readEventGalleryPart(db,id,part),/Invalid event/);
 assert.equal(calls,1,'invalid input must not query storage');
});
