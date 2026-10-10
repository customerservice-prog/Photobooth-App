import test from 'node:test';
import assert from 'node:assert/strict';
import {safeSignedOutReturnDestination,safeStaffDestination} from '../app/lib/staff-navigation.mjs';

test('staff sign-in preserves the event and return path selected before authentication',()=>{
 const requested='/event-prep?booth_event=EV-2026&returnTo=%2F%3Fbooth_event%3DEV-2026';
 const destination=safeStaffDestination(requested),url=new URL(destination,'https://booth.example.test');
 assert.equal(url.pathname,'/event-prep');assert.equal(url.searchParams.get('booth_event'),'EV-2026');
 assert.equal(safeSignedOutReturnDestination(url.searchParams.get('returnTo')),'/?booth_event=EV-2026');
});

test('canceling an expired staff sign-in cannot loop back to a protected page',()=>{
 for(const returnTo of ['/setup','/setup?booth_event=EV-2026','/event-prep?returnTo=%2Fsetup','/print-test','/designs']){
  assert.equal(safeSignedOutReturnDestination(returnTo),'/launch',returnTo);
 }
 for(const returnTo of ['/','/launch','/staff/start?event=EV-2026','/?booth_event=EV-2026']){
  assert.equal(safeSignedOutReturnDestination(returnTo),returnTo,returnTo);
 }
});

test('sign-in rejects external, disguised and recursive navigation destinations',()=>{
 for(const destination of [null,'','https://attacker.example/setup','//attacker.example/setup','/\\attacker.example/setup','/%2f%2fattacker.example/setup','/staff/sign-in?next=%2Fsetup','/capture','/setup#other']){
  assert.equal(safeStaffDestination(destination),'/staff/start',String(destination));
 }
 for(const destination of [null,'','https://attacker.example','//attacker.example','/\\attacker.example','/%2f%2fattacker.example','/staff/sign-in?next=%2Fsetup','/launch#other']){
  assert.equal(safeSignedOutReturnDestination(destination),'/launch',String(destination));
 }
});
