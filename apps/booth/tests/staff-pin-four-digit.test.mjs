import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {STAFF_PIN_LENGTH,isValidStaffPin,normalizeStaffPinInput} from '../app/lib/staff-pin.mjs';
import {matchesConfiguredStaffPin} from '../app/lib/staff-pin-server.mjs';
import {rememberOfflineStaffPin,verifyOfflineStaffPin} from '../app/lib/staff-offline-pin.mjs';

const SAMPLE_PIN='4826'; // Test-only placeholder, NOT a real staff credential.
if(!globalThis.crypto)globalThis.crypto=webcrypto;
function store(){
 const map=new Map();
 return {
  getItem:key=>map.get(key)||null,
  setItem:(key,value)=>map.set(key,String(value)),
  removeItem:key=>map.delete(key),
  entries:()=>Object.fromEntries(map)
 };
}
test('guest access dialog accepts exactly four numeric staff digits',()=>{
 assert.equal(STAFF_PIN_LENGTH,4);
 assert.equal(isValidStaffPin(SAMPLE_PIN),true);
 for(const invalid of ['123','12345','12345678','12a4','',null,1234])assert.equal(isValidStaffPin(invalid),false);
 assert.equal(normalizeStaffPinInput('48x26extra'),'4826');
});
test('staff PIN verifies against Railway-style SHA256, never the actual PIN in the client bundle',()=>{
 const fakeHash=createHash('sha256').update(SAMPLE_PIN).digest('hex');
 assert.equal(matchesConfiguredStaffPin(SAMPLE_PIN,fakeHash),true);
 assert.equal(matchesConfiguredStaffPin('4827',fakeHash),false);
 assert.equal(matchesConfiguredStaffPin('00004826',fakeHash),false);
 assert.equal(matchesConfiguredStaffPin(SAMPLE_PIN,'not configured'),false);
 assert.equal(matchesConfiguredStaffPin('',fakeHash),false);
});
test('offline verifier is created only after online staff authorization and is never plaintext',async()=>{
 const storage=store();
 assert.equal(await verifyOfflineStaffPin(storage,SAMPLE_PIN),false);
 assert.equal(await rememberOfflineStaffPin(storage,SAMPLE_PIN),true);
 assert.equal(await verifyOfflineStaffPin(storage,SAMPLE_PIN),true);
 assert.equal(await verifyOfflineStaffPin(storage,'4827'),false);
 assert.equal(await verifyOfflineStaffPin(storage,'00004826'),false);
 const stored=JSON.parse(storage.getItem('friendly-booth-offline-staff-v1'));
 assert.equal(stored.version,2);
 assert.deepEqual(Object.keys(stored).sort(),['digest','salt','version']);
 assert(!Object.values(stored).includes(SAMPLE_PIN),'the raw PIN is never stored as a value');
 stored.version=1;
 storage.setItem('friendly-booth-offline-staff-v1',JSON.stringify(stored));
 assert.equal(await verifyOfflineStaffPin(storage,SAMPLE_PIN),false,'legacy eight-digit verifier must not authorize the new PIN');
});
