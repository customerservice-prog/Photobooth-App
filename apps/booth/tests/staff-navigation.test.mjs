import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnDestination,safeStaffDestination,safeSignedOutReturnDestination,eventHome,readReturnDestination,withReturnTo} from '../app/lib/staff-navigation.mjs';
import {workspace} from '../app/lib/event-workspace.mjs';
import {ACTIVE_EVENT_KEY} from '../app/lib/active-event.mjs';
import {updateDestination} from '../app/lib/app-update.mjs';
const saved=new Map([[ACTIVE_EVENT_KEY,'active-other'],['friendly-booth-transfer-v1-active-other-config',JSON.stringify({eventId:'active-other'})]]);
const storage={getItem:key=>saved.get(key)??null};
test('staff detours return to their originating imported event instead of the assigned other event',()=>{
 const home=eventHome(workspace('?booth_event=event-one'));
 const printer=withReturnTo('/print-test',home);
 assert.equal(readReturnDestination(new URL(printer,'https://booth.test').search,storage),home);
 const delivery=withReturnTo('/delivery-check',printer);
 assert.equal(readReturnDestination(new URL(delivery,'https://booth.test').search,storage),printer);
 assert.equal(readReturnDestination('?booth_event=event-one',storage),home);
});
test('demo and local rehearsal remain separate from an assigned customer event through Back and app updates',()=>{
 const demo=eventHome(workspace('?event=oct10-2026&demo=1'));
 assert.equal(readReturnDestination(new URL(withReturnTo('/help',demo),'https://booth.test').search,storage),demo);
 const local=eventHome(workspace());
 assert.equal(local,'/?local=1');assert.equal(readReturnDestination('?local=1',storage),local);
 assert.equal(updateDestination('/','?local=1','2026.10.10.2',123),'/?local=1&boothv=2026.10.10.2&refresh=123');
});
test('only known internal pages can be PIN destinations or return links',()=>{
 for(const value of ['https://other.test/setup','//other.test/setup','/\\other.test/setup','/staff/sign-in?next=/setup','/unknown','javascript:alert(1)']){
  assert.equal(safeStaffDestination(value),'/staff/start');assert.equal(safeReturnDestination(value),'');
 }
 assert.equal(safeStaffDestination('/print-test?returnTo=%2F%3Fbooth_event%3Devent-one'),'/print-test?returnTo=%2F%3Fbooth_event%3Devent-one');
 assert.equal(safeSignedOutReturnDestination('/event-prep'),'/launch');
 assert.equal(safeSignedOutReturnDestination('/?booth_event=event-one'),'/?booth_event=event-one');
});
