// Private, time-limited backup copy in the existing Railway PostgreSQL service.
// Local iPad originals remain authoritative until the server confirms each file.
let pool,ready;
export const DEFAULT_BACKUP_MAX_IMAGES=10000;
export const MAX_BACKUP_IMAGE_BYTES=3145728;
export function backupImageLimit(env=process.env){
 const configured=String(env.BOOTH_BACKUP_MAX_IMAGES||'');
 const value=/^\d+$/.test(configured)?Number(configured):NaN;
 return Number.isSafeInteger(value)&&value>=1500&&value<=50000?value:DEFAULT_BACKUP_MAX_IMAGES;
}
export class BackupStorageLimitError extends Error{
 constructor(){super('This event has reached its online photo storage limit.');this.code='EVENT_BACKUP_STORAGE_LIMIT';}
}
export async function database(){
 if(!process.env.DELIVERY_DATABASE_URL)throw new Error('Backup database connection is not configured');
 if(!pool){
  const {Pool}=await import('pg');
  pool=new Pool({connectionString:process.env.DELIVERY_DATABASE_URL,max:3,connectionTimeoutMillis:5000});
  pool.on('error',()=>{});
 }
 if(!ready)ready=pool.query(`CREATE SCHEMA IF NOT EXISTS booth_backup_v1;
 CREATE TABLE IF NOT EXISTS booth_backup_v1.images(
  event_id text NOT NULL,
  capture_id text NOT NULL,
  kind text NOT NULL,
  image bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
  PRIMARY KEY(event_id,capture_id,kind)
 );
 CREATE INDEX IF NOT EXISTS booth_backup_expiry ON booth_backup_v1.images(expires_at);
 `).catch(err=>{ready=null;throw err;});
 await ready;return pool;
}
export async function storeBackupImage(eventId,captureId,kind,image){
 const db=await database();
 return persistBackupImage(db,eventId,captureId,kind,image);
}
export async function persistBackupImage(db,eventId,captureId,kind,image,{maxImages=backupImageLimit()}={}){
 if(typeof eventId!=='string'||!/^[A-Za-z0-9_-]{3,90}$/.test(eventId)||typeof captureId!=='string'||!/^[A-Za-z0-9_-]{3,100}$/.test(captureId)||
  !/^pose-[1-4]$|^collage$|^keepsake$/.test(kind)||!Buffer.isBuffer(image)||image.length<4||image.length>MAX_BACKUP_IMAGE_BYTES||
  image[0]!==255||image[1]!==216||image.at(-2)!==255||image.at(-1)!==217)throw new Error('Invalid event backup image.');
 const client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='10s'");
  // A PostgreSQL transaction lock protects the count and deduplication across
  // every booth replica, while unrelated events can continue uploading.
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['booth-backup-v1:'+eventId]);
  await client.query('DELETE FROM booth_backup_v1.images WHERE expires_at<now()');
  const existing=await client.query('SELECT image=$4::bytea AS same_image FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,kind,image]);
  let result='already saved';
  if(existing.rowCount){
   // The original poses and capture collage are immutable. Only the finished
   // keepsake can be re-rendered, and it replaces this exact event/capture row.
   if(kind==='keepsake'&&!existing.rows[0].same_image){
    await client.query("UPDATE booth_backup_v1.images SET image=$4,expires_at=now()+interval '30 days' WHERE event_id=$1 AND capture_id=$2 AND kind=$3",[eventId,captureId,kind,image]);
    result='updated';
   }else{
    // An acknowledgment guarantees another 30 days online, including retries
    // after an old local acknowledgment ages out. Never change original bytes.
    await client.query("UPDATE booth_backup_v1.images SET expires_at=now()+interval '30 days' WHERE event_id=$1 AND capture_id=$2 AND kind=$3",[eventId,captureId,kind]);
   }
  }else{
   // The higher default covers roughly 1,666 four-pose sessions. An optional
   // bounded override supports larger events without mandatory configuration.
   const {rows}=await client.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
   if(rows[0].count>=maxImages)throw new BackupStorageLimitError();
   await client.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[eventId,captureId,kind,image]);
   result='saved';
  }
  await client.query('COMMIT');
  return result;
 }catch(error){
  try{await client.query('ROLLBACK');}catch{}
  throw error;
 }finally{client.release();}
}
