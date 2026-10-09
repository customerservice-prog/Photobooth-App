import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readEventGalleryPart,galleryFiles,zipJpegs,GALLERY_KINDS,GALLERY_IMAGE_MAX_BYTES,galleryPartSize} from '../lib/event-gallery-zip.mjs';
import {readEventBackups} from '../lib/event-backups.mjs';

test('real PostgreSQL exports all private event photos in complete bounded session parts',async t=>{
 // This writes synthetic fixtures only to an explicitly selected disposable DB.
 if(process.env.RUN_LIVE_GALLERY_DB_TEST!=='true'||!process.env.DELIVERY_DATABASE_URL){
  t.skip('Requires RUN_LIVE_GALLERY_DB_TEST=true and a disposable PostgreSQL service');return;
 }
 const {Pool}=createRequire(new URL('../../booth/package.json',import.meta.url))('pg');
 const pool=new Pool({connectionString:process.env.DELIVERY_DATABASE_URL,max:1}),eventId='gallery-test-'+process.pid+'-'+Date.now(),otherEvent=eventId+'-other',largeEvent=eventId+'-large';
 const db={$queryRaw:async(strings,...values)=>{
  const sql=strings.reduce((result,chunk,i)=>result+chunk+(i<values.length?'$'+(i+1):''),'');
  return (await pool.query(sql,values)).rows;
 }};
 try{
  await pool.query(`CREATE SCHEMA IF NOT EXISTS booth_backup_v1;
   CREATE TABLE IF NOT EXISTS booth_backup_v1.images(event_id text NOT NULL,capture_id text NOT NULL,kind text NOT NULL,image bytea NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',PRIMARY KEY(event_id,capture_id,kind))`);
  const originals=new Map();
  for(let session=1;session<=51;session++)for(const [k,kind] of GALLERY_KINDS.entries()){
   const capture='capture-'+String(session).padStart(3,'0'),image=Buffer.from([255,216,session,k,255,217]);
   originals.set(capture+':'+kind,image);
   await pool.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image,created_at) VALUES($1,$2,$3,$4,$5)',[eventId,capture,kind,image,'2026-10-09T12:00:00.000Z']);
  }
  await pool.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[eventId,'capture-expired','pose-1',Buffer.from([255,216,255,217]),'2026-10-08T12:00:00.000Z',new Date(0)]);
  await pool.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image) VALUES($1,$2,$3,$4)',[otherEvent,'capture-001','pose-1',Buffer.from([255,216,99,255,217])]);
  const first=await readEventGalleryPart(db,eventId,1),second=await readEventGalleryPart(db,eventId,2),third=await readEventGalleryPart(db,eventId,3);
  assert.equal(first.length,300);assert.equal(second.length,6);assert.equal(third.length,0);
  assert.deepEqual([...new Set(first.map(row=>row.capture_id))],Array.from({length:50},(_,i)=>'capture-'+String(i+1).padStart(3,'0')));
  assert.deepEqual(second.map(row=>row.kind),GALLERY_KINDS);
  for(const row of [...first,...second])assert.deepEqual(row.image,originals.get(row.capture_id+':'+row.kind),'all original and finished bytes must remain exact and event scoped');
  const firstFiles=galleryFiles(first,{eventName:'Disposable proof',eventId,part:1,partSize:first[0].part_size});
  assert.equal(firstFiles.length,301);assert.equal(firstFiles.at(-1).name,'session-0050/keepsake.jpg');
  assert((zipJpegs(firstFiles)).size<GALLERY_IMAGE_MAX_BYTES);
  const secondFiles=galleryFiles(second,{eventName:'Disposable proof',eventId,part:2,partSize:second[0].part_size});
  assert.equal(secondFiles[1].name,'session-0051/pose-1.jpg');
  const summary=await readEventBackups(db,eventId);
  assert.equal(summary.totalSessions,51);assert.equal(summary.totalOriginals,204);assert.equal(summary.totalFinishedFiles,102);assert.equal(summary.totalFiles,306);assert.equal(summary.partSize,50);
  // A pose-only interrupted capture must still have a downloadable session.
  await pool.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image) VALUES($1,$2,$3,$4)',[eventId,'capture-052','pose-1',Buffer.from([255,216,52,255,217])]);
  const withInterrupted=await readEventGalleryPart(db,eventId,2);
  assert.equal(withInterrupted.length,7);assert(withInterrupted.some(row=>row.capture_id==='capture-052'&&row.kind==='pose-1'));
  assert.equal((await readEventBackups(db,eventId)).totalSessions,52);
  // Twenty full sessions with 1 MiB originals need automatic smaller parts;
  // highly compressible synthetic bytes keep the disposable fixture inexpensive.
  await pool.query(`INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image,created_at)
   SELECT $1,'large-'||lpad(session::text,3,'0'),kind,decode('ffd8'||repeat('00',1048572)||'ffd9','hex'),'2026-10-09T12:00:00.000Z'::timestamptz
   FROM generate_series(1,20) AS session CROSS JOIN unnest($2::text[]) AS kind`,[largeEvent,GALLERY_KINDS]);
  const largeSummary=await readEventBackups(db,largeEvent),expectedPartSize=galleryPartSize(6*1024*1024);
  assert.equal(largeSummary.partSize,expectedPartSize);assert.equal(expectedPartSize,18);
  const largeFirst=await readEventGalleryPart(db,largeEvent,1),largeSecond=await readEventGalleryPart(db,largeEvent,2);
  assert.equal(new Set(largeFirst.map(row=>row.capture_id)).size,18);assert.equal(new Set(largeSecond.map(row=>row.capture_id)).size,2);
  for(const row of [...largeFirst,...largeSecond])assert.equal(row.image.length,1024*1024,'automatic parts retain every uploaded asset');
  assert(largeFirst.reduce((sum,row)=>sum+row.image.length,0)<=GALLERY_IMAGE_MAX_BYTES);
  assert.equal(largeFirst[0].part_size,largeSummary.partSize,'page and downloads must use the same part size');
  const largeZip=zipJpegs(galleryFiles(largeSecond,{eventName:'Large disposable proof',eventId:largeEvent,part:2,partSize:largeSecond[0].part_size}));
  assert(largeZip.size<GALLERY_IMAGE_MAX_BYTES);
 }finally{
  await pool.query('DELETE FROM booth_backup_v1.images WHERE event_id=ANY($1::text[])',[[eventId,otherEvent,largeEvent]]);
  await pool.end();
 }
});
