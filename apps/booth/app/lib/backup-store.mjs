// Private, time-limited backup copy in the existing Railway PostgreSQL service.
// Local iPad originals remain authoritative until the server confirms each file.
let pool,ready;
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
 await db.query('DELETE FROM booth_backup_v1.images WHERE expires_at<now()');
 const existing=await db.query('SELECT 1 FROM booth_backup_v1.images WHERE event_id=$1 AND capture_id=$2 AND kind=$3',[eventId,captureId,kind]);
 if(existing.rowCount)return 'already saved';
 // Storage ceiling per event prevents a runaway iPad from filling the database.
 const {rows}=await db.query('SELECT count(*)::int AS count FROM booth_backup_v1.images WHERE event_id=$1',[eventId]);
 if(rows[0].count>=1500)throw new Error('This event has reached its secure backup storage limit.');
 await db.query('INSERT INTO booth_backup_v1.images(event_id,capture_id,kind,image) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[eventId,captureId,kind,image]);
 return 'saved';
}
