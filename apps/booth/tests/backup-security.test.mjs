import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizeBackup,verifyBackupTicket} from '../app/lib/backup-auth.mjs';
import {saveBackupToken,backupEnabled} from '../app/lib/backup-sync.mjs';
test('backup tickets are scoped to one event and cannot be reused for another',()=>{
 const old=process.env.BOOTH_BACKUP_SECRET;
 process.env.BOOTH_BACKUP_SECRET='test-only-backup-token-secret-longer-than-32';
 try{
  const ticket=authorizeBackup('event-2026');
  assert.equal(verifyBackupTicket(ticket,'event-2026'),true);
  assert.equal(verifyBackupTicket(ticket,'other-event'),false);
  assert.equal(verifyBackupTicket(ticket+'abc','event-2026'),false);
 }finally{if(old===undefined)delete process.env.BOOTH_BACKUP_SECRET;else process.env.BOOTH_BACKUP_SECRET=old;}
});
test('backup access is never enabled without staff authorization',()=>{
 const data=new Map();
 const store={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(backupEnabled(store,'event-2026'),false);
 saveBackupToken(store,'event-2026','test-token');
 assert.equal(backupEnabled(store,'event-2026'),true);
 assert.equal(backupEnabled(store,'another-event'),false);
});