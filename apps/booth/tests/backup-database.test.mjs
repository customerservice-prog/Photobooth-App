import test from 'node:test';
import assert from 'node:assert/strict';
import {database,storeBackupImage} from '../app/lib/backup-store.mjs';
test('PostgreSQL backup is private, event scoped and idempotent',async t=>{
 // Railway's isolated build has a DATABASE_URL but cannot resolve the private
 // runtime-only postgres. Run this destructive integration test only against
 // an explicitly selected disposable test database.
 if(process.env.RUN_LIVE_BACKUP_DB_TEST!=='true'||!process.env.DELIVERY_DATABASE_URL){
  t.skip('Requires RUN_LIVE_BACKUP_DB_TEST=true and a temporary reachable PostgreSQL service');return;
 }
 const db=await database(),eventId='test-'+process.pid+'-'+Date.now(),captureId='capture-proof';
 try{
  const schema=await db.query("SELECT to_regclass('booth_backup_v1.images') AS table_name");
  assert.equal(schema.rows[0].table_name,'booth_backup_v1.images','authorization can initialize storage before any photographs exist');
  const empty=await db.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
  assert.equal(empty.rows[0].count,0,'ready storage does not imply any saved photographs');
  const image=Buffer.from([255,216,42,42,255,217]);
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',image),'saved');
  assert.equal(await storeBackupImage(eventId,captureId,'pose-1',image),'already saved');
  const result=await db.query('SELECT event_id,kind,octet_length(image) AS size FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].kind,'pose-1');
  assert.equal(result.rows[0].size,image.length);
  const readyAgain=await database();
  const preserved=await readyAgain.query('SELECT image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,'pose-1']);
  assert.deepEqual(preserved.rows[0].image,image,'checking initialized storage preserves existing photographs');
  const other=await db.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',['other-event']);
  assert.equal(other.rows[0].count,0);
 }finally{await db.query('DELETE FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);await db.end();}
});
