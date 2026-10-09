import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {authorizeBackup,verifyBackupTicket} from '../app/lib/backup-auth.mjs';
import {backupImageLimit,DEFAULT_BACKUP_MAX_IMAGES,MAX_BACKUP_IMAGE_BYTES,BackupStorageLimitError} from '../app/lib/backup-store.mjs';

const source=await readFile(new URL('../app/api/backup/image/route.js',import.meta.url),'utf8');
const makeRoute=new Function('NextResponse','verifyBackupTicket','storeBackupImage','MAX_BACKUP_IMAGE_BYTES',source.replace(/^import .*;\n/gm,'').replace(/\bexport /g,'')+'\nreturn POST;');
const image=Buffer.from([255,216,42,17,255,217]);
async function withSecret(run){
 const before=process.env.BOOTH_BACKUP_SECRET;process.env.BOOTH_BACKUP_SECRET='test-only-image-route-backup-secret-at-least-32-characters';
 try{return await run();}
 finally{if(before===undefined)delete process.env.BOOTH_BACKUP_SECRET;else process.env.BOOTH_BACKUP_SECRET=before;}
}
function request(token,{event='event-proof',capture='capture-proof',kind='keepsake',body=image,headers={}}={}){
 return new Request('https://booth.example.test/api/backup/image',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/jpeg','X-Booth-Event':event,'X-Booth-Capture':capture,'X-Booth-Kind':kind,...headers},body});
}
function route(store=async()=> 'saved'){
 const calls=[];
 const handler=makeRoute({json:Response.json},verifyBackupTicket,async(...args)=>{calls.push(args);return store(...args);},MAX_BACKUP_IMAGE_BYTES);
 return {handler,calls};
}

test('backup ceiling covers long rentals and accepts only bounded optional overrides',()=>{
 assert.equal(DEFAULT_BACKUP_MAX_IMAGES,10000);
 assert.equal(backupImageLimit({}),10000);
 for(const value of ['1500','10000','50000'])assert.equal(backupImageLimit({BOOTH_BACKUP_MAX_IMAGES:value}),Number(value));
 for(const value of ['0','1499','50001','10000.5','NaN','-1','1e9','9007199254740993'])assert.equal(backupImageLimit({BOOTH_BACKUP_MAX_IMAGES:value}),10000);
});

test('authorized image uploads preserve exact JPEG bytes and scoped identifiers before acknowledgment',async()=>{
 await withSecret(async()=>{
  const proof=route(),response=await proof.handler(request(authorizeBackup('event-proof')));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(proof.calls.length,1);
  assert.deepEqual(proof.calls[0],['event-proof','capture-proof','keepsake',image]);
 });
});

test('event storage limits return a non-retryable typed failure without exposing database details',async()=>{
 await withSecret(async()=>{
  for(const error of [new BackupStorageLimitError(),Object.assign(new Error('private quota pg connection'),{code:'53100'}),Object.assign(new Error('private pg path'),{code:'53400'})]){
   const proof=route(async()=>{throw error;}),response=await proof.handler(request(authorizeBackup('event-proof')));
   assert.equal(response.status,507);
   assert.equal(response.headers.get('Cache-Control'),'no-store');
   const body=await response.json();
   assert.equal(body.ok,false);assert.equal(body.retryable,false);
   assert.equal(body.code,error instanceof BackupStorageLimitError?'EVENT_BACKUP_STORAGE_LIMIT':'BACKUP_STORAGE_FULL');
   assert.match(body.error,/Photos remain on this iPad/);
   assert.match(body.error,/Ask the owner for help/);
   assert.doesNotMatch(JSON.stringify(body),/private|connection|pg path/);
  }
 });
});

test('transient database failures return a sanitized retryable failure and no acknowledgment',async()=>{
 await withSecret(async()=>{
  const proof=route(async()=>{throw Object.assign(new Error('postgresql://private-user:private-password@private-host'),{code:'ECONNRESET'});});
  const response=await proof.handler(request(authorizeBackup('event-proof')));
  assert.equal(response.status,503);assert.equal(response.headers.get('Cache-Control'),'no-store');
  const body=await response.json();
  assert.equal(body.ok,false);assert.equal(body.retryable,true);assert.equal(body.code,'BACKUP_STORAGE_UNAVAILABLE');
  assert.match(body.error,/retry while online/);assert.doesNotMatch(JSON.stringify(body),/postgresql|private-user|private-password|private-host|ECONNRESET/);
 });
});

test('unauthorized, wrong-event, malformed and oversized uploads never reach storage',async()=>{
 await withSecret(async()=>{
  const token=authorizeBackup('event-proof');
  const cases=[['invalid-token',{},401],[token,{event:'another-event'},401],[token,{capture:'capture/path'},400],
   [token,{kind:'pose-5'},400],[token,{kind:'keepsake-extra'},400],[token,{body:Buffer.from([0,1,2,3])},400],
   [token,{headers:{'Content-Type':'image/png'}},415],[token,{headers:{'Content-Length':String(MAX_BACKUP_IMAGE_BYTES+1)}},413],
   [token,{body:Buffer.alloc(MAX_BACKUP_IMAGE_BYTES+1)},413]];
  for(const [proofToken,options,status] of cases){
   const proof=route(),response=await proof.handler(request(proofToken,options));
   assert.equal(response.status,status);assert.equal(proof.calls.length,0);
  }
 });
});
