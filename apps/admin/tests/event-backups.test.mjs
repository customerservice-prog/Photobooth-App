import test from 'node:test';
import assert from 'node:assert/strict';
import {readEventBackups} from '../lib/event-backups.mjs';
const emptyCounts={totalSessions:0,totalFinished:0,totalOriginals:0,totalFinishedFiles:0,totalFiles:0,maxSessionBytes:0,partSize:50};

function fakeDatabase({initialized=true,images=[],failAt=0}={}){
 const queries=[];
 return {queries,$executeRaw(){throw new Error('Gallery reads cannot mutate storage');},
  async $queryRaw(strings,...values){
   const sql=strings.join('?');queries.push({sql,values});
   assert.match(sql,/^(?:SELECT |WITH sessions AS)/);
   assert.doesNotMatch(sql,/\b(?:DELETE|INSERT|UPDATE|CREATE|DROP)\b/i);
   if(failAt===queries.length)throw new Error('Database connection unavailable');
   if(sql.includes('to_regclass'))return [{relation:initialized?'booth_backup_v1.images':null}];
   const visible=images.filter(image=>image.event_id===values[0]&&image.expires_at>new Date()&&['pose-1','pose-2','pose-3','pose-4','keepsake','collage'].includes(image.kind));
   if(sql.includes('WITH sessions AS'))return [{sessions:BigInt(new Set(visible.map(image=>image.capture_id)).size),
    finished_sessions:BigInt(new Set(visible.filter(image=>['keepsake','collage'].includes(image.kind)).map(image=>image.capture_id)).size),
    originals:BigInt(visible.filter(image=>image.kind.startsWith('pose-')).length),finished_files:BigInt(visible.filter(image=>['keepsake','collage'].includes(image.kind)).length),files:BigInt(visible.length),
    max_session_bytes:BigInt(Math.max(0,...[...new Set(visible.map(image=>image.capture_id))].map(id=>visible.filter(image=>image.capture_id===id).reduce((total,image)=>total+image.bytes,0))))}];
   return visible.slice(0,500);
  }
 };
}
const image=(event_id,capture_id,kind,expires_at=new Date(Date.now()+86400000))=>({event_id,capture_id,kind,expires_at,created_at:new Date(),bytes:12345});

test('reachable database awaiting its first upload is distinct from a connection failure',async()=>{
 const db=fakeDatabase({initialized:false});
 assert.deepEqual(await readEventBackups(db,'event-a'),{state:'awaiting-setup',rows:[],...emptyCounts});
 assert.equal(db.queries.length,1,'missing storage must not query a nonexistent table');
 assert.match(db.queries[0].sql,/to_regclass\('booth_backup_v1\.images'\)/);
 assert.deepEqual(db.queries[0].values,[]);
});
test('initialized storage with no event photos is empty, never unavailable',async()=>{
 const db=fakeDatabase();
 assert.deepEqual(await readEventBackups(db,'event-a'),{state:'empty',rows:[],...emptyCounts});
 assert.equal(db.queries.length,3);
 for(const query of db.queries.slice(1))assert.deepEqual(query.values,['event-a']);
});
test('gallery reads are event scoped and count finished sessions without duplicating collage and keepsake',async()=>{
 const a=[image('event-a','capture-1','pose-1'),image('event-a','capture-1','collage'),image('event-a','capture-1','keepsake'),image('event-a','capture-2','collage')];
 const db=fakeDatabase({images:[...a,image('event-b','capture-other','keepsake'),image('event-a','expired','keepsake',new Date(0))]});
 const result=await readEventBackups(db,'event-a');
 assert.equal(result.state,'available');
 assert.equal(result.totalFinished,2);
 assert.equal(result.totalSessions,2);assert.equal(result.totalOriginals,1);assert.equal(result.totalFinishedFiles,3);assert.equal(result.totalFiles,4);
 assert.deepEqual(result.rows,a);
 for(const query of db.queries.slice(1)){
  assert.match(query.sql,/WHERE event_id=\? AND expires_at>now\(\)/);
  assert.deepEqual(query.values,['event-a']);
  assert(!query.sql.includes('event-a'),'event identifiers must remain bound parameters');
 }
});
test('unfinished original poses remain available without claiming a finished gallery',async()=>{
 const db=fakeDatabase({images:[image('event-a','capture-1','pose-1')]});
 const result=await readEventBackups(db,'event-a');
 assert.equal(result.state,'available');assert.equal(result.totalFinished,0);assert.equal(result.totalSessions,1);assert.equal(result.totalOriginals,1);assert.equal(result.totalFinishedFiles,0);assert.equal(result.totalFiles,1);assert.equal(result.rows.length,1);
});
for(const failAt of [1,2,3])test('failure at read '+failAt+' remains unavailable rather than an empty or partial gallery',async()=>{
 const db=fakeDatabase({images:[image('event-a','capture-1','keepsake')],failAt});
 assert.deepEqual(await readEventBackups(db,'event-a'),{state:'unavailable',rows:[],...emptyCounts});
});
