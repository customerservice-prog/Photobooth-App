import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdminSession,validAdminSession} from '../lib/admin-auth.mjs';
const secret='owner-session-only-test-secret-more-than-32-bytes';
test('owner cookie is signed and refuses tampering',async()=>{
 const now=Date.now(),value=await createAdminSession(secret,now);
 assert.equal(await validAdminSession(value,secret,now),true);
 assert.equal(await validAdminSession(value,secret+'x',now),false);
 assert.equal(await validAdminSession(value,secret,now+28801000),false);
 assert.equal(await validAdminSession('not-a-session',secret,now),false);
 assert.equal(await validAdminSession(value.slice(0,-1)+(value.endsWith('0')?'1':'0'),secret,now),false);
});
test('owner authentication fails closed without a secret',async()=>{
 await assert.rejects(createAdminSession(''));
 assert.equal(await validAdminSession('',''),false);
});
