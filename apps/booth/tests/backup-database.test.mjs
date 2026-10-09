import test from 'node:test';
import assert from 'node:assert/strict';
import {database,storeBackupImage,persistBackupImage,BackupStorageLimitError} from '../app/lib/backup-store.mjs';
test('PostgreSQL backup is private, event scoped and idempotent',async t=>{
 // Railway's isolated build has a DATABASE_URL but cannot resolve the private
 // runtime-only postgres. Run this destructive integration test only against
 // an explicitly selected disposable test database.
 if(process.env.RUN_LIVE_BACKUP_DB_TEST!=='true'||!process.env.DELIVERY_DATABASE_URL){
  t.skip('Requires RUN_LIVE_BACKUP_DB_TEST=true and a temporary reachable PostgreSQL service');return;
 }
 const db=await database(),eventId='test-'+process.pid+'-'+Date.now(),captureId='capture-proof';
 const otherEvent=eventId+'-other',capacityEvent=eventId+'-capacity',limitEvent=eventId+'-limit';
 let anotherPool;
 try{
  const schema=await db.query("SELECT to_regclass('booth_backup_v1.images') AS table_name");
  assert.equal(schema.rows[0].table_name,'booth_backup_v1.images','authorization can initialize storage before any photographs exist');
  const empty=await db.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
  assert.equal(empty.rows[0].count,0,'ready storage does not imply any saved photographs');
  const image=Buffer.from([255,216,42,42,255,217]);
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',image),'saved');
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',image),'already saved');
  const updatedImage=Buffer.from([255,216,77,88,99,255,217]);
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',updatedImage),'already saved');
  assert.equal(await storeBackupImage(eventId,captureId,'collage',image),'saved');
  assert.equal(await storeBackupImage(eventId,captureId,'collage',updatedImage),'already saved');
  assert.equal(await storeBackupImage(eventId,captureId,'keepsake',image),'saved');
  const lifetime=await db.query('SELECT created_at,expires_at FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,'keepsake']);
  await db.query("UPDATE booth_backup_v1.images SET expires_at=now()+interval '1 day' WHERE event_id=$1 AND capture_id=$2 AND kind=$3",[eventId,captureId,'keepsake']);
  assert.equal(await storeBackupImage(eventId,captureId,'keepsake',updatedImage),'updated');
  assert.equal(await storeBackupImage(eventId,captureId,'keepsake',updatedImage),'already saved');
  const result=await db.query('SELECT event_id,kind,octet_length(image) AS size FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
  assert.equal(result.rows.length,3);
  assert.equal(result.rows.find(row=>row.kind==='pose-1').size,image.length);
  const after=await db.query('SELECT image,created_at,expires_at FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,'keepsake']);
  assert.deepEqual(after.rows[0].image,updatedImage,'a changed keepsake replaces exact JPEG bytes');
  assert.equal(after.rows[0].created_at.getTime(),lifetime.rows[0].created_at.getTime(),'updating keepsakes preserves session order');
  assert(after.rows[0].expires_at.getTime()>Date.now()+29*86400000,'a keepsake acknowledgment guarantees another 30 days online');
  const readyAgain=await database();
  const preserved=await readyAgain.query('SELECT image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,'pose-1']);
  assert.deepEqual(preserved.rows[0].image,image,'checking initialized storage preserves existing photographs');
  const collage=await db.query('SELECT image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,'collage']);
  assert.deepEqual(collage.rows[0].image,image,'a retry cannot replace the capture collage');
  await db.query("UPDATE booth_backup_v1.images SET expires_at=now()+interval '1 day' WHERE event_id=$1 AND capture_id=$2",[eventId,captureId]);
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',updatedImage),'already saved');
  assert.equal(await storeBackupImage(eventId,captureId,'collage',updatedImage),'already saved');
  assert.equal(await storeBackupImage(eventId,captureId,'keepsake',updatedImage),'already saved');
  const refreshed=await db.query('SELECT kind,image,created_at,expires_at FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2',[eventId,captureId]);
  for(const row of refreshed.rows){
   assert(row.expires_at.getTime()>Date.now()+29*86400000,row.kind+' duplicate acknowledgment refreshes only its retention');
   assert.deepEqual(row.image,row.kind==='keepsake'?updatedImage:image,row.kind+' retains the authoritative JPEG bytes');
  }
  assert.equal(refreshed.rows.find(row=>row.kind==='keepsake').created_at.getTime(),lifetime.rows[0].created_at.getTime());
  assert.equal(await storeBackupImage(otherEvent,captureId,'keepsake',image),'saved');
  assert.equal(await storeBackupImage(eventId,captureId,'keepsake',Buffer.from([255,216,17,255,217])),'updated');
  const other=await db.query('SELECT image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[otherEvent,captureId,'keepsake']);
  assert.deepEqual(other.rows[0].image,image,'a same-ID keepsake in another event remains byte-for-byte intact');

  // Separate pools exercise the database lock rather than an in-process guard.
  const {Pool}=await import('pg');
  anotherPool=new Pool({connectionString:process.env.DELIVERY_DATABASE_URL,max:3,connectionTimeoutMillis:5000});
  const concurrent=await Promise.all(Array.from({length:12},(_,index)=>persistBackupImage(index%2?anotherPool:db,eventId,'concurrent-capture','pose-2',image)));
  assert.equal(concurrent.filter(state=>state==='saved').length,1);
  assert.equal(concurrent.filter(state=>state==='already saved').length,11);
  const deduped=await db.query('SELECT image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,'concurrent-capture','pose-2']);
  assert.equal(deduped.rows.length,1);assert.deepEqual(deduped.rows[0].image,image);

  await db.query("INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image) SELECT $1,'seed-'||n,'pose-1',$2 FROM generate_series(1,1500) AS n",[capacityEvent,image]);
  assert.equal(await storeBackupImage(capacityEvent,'beyond-old-limit','pose-1',image),'saved','a normal rental does not stop at the former 1,500-file ceiling');

  await persistBackupImage(db,limitEvent,captureId,'keepsake',image,{maxImages:2});
  const limited=await Promise.allSettled(['capacity-a','capacity-b'].map((id,index)=>persistBackupImage(index?anotherPool:db,limitEvent,id,'pose-1',image,{maxImages:2})));
  assert.equal(limited.filter(item=>item.status==='fulfilled').length,1,'only one concurrent request may consume the remaining storage slot');
  assert(limited.find(item=>item.status==='rejected').reason instanceof BackupStorageLimitError);
  assert.equal(await persistBackupImage(db,limitEvent,captureId,'keepsake',updatedImage,{maxImages:2}),'updated','a changed keepsake can replace its existing row at the file limit');
  const limitedCount=await db.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',[limitEvent]);
  assert.equal(limitedCount.rows[0].count,2,'advisory locking preserves the cap across separate PostgreSQL pools');
 }finally{
  await db.query('DELETE FROM booth_backup_v1.images WHERE event_id=ANY($1::text[])',[[eventId,otherEvent,capacityEvent,limitEvent]]);
  if(anotherPool)await anotherPool.end();
  await db.end();
 }
});
