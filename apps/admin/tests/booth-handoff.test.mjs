import test from 'node:test';
import assert from 'node:assert/strict';
import {makeEventHandoff,encodeHandoff,makeHandoffLink} from '../lib/booth-handoff.mjs';
const sample={id:'efcbaffc-893f-4361-983b-79a38e7d111a',name:'October 10 Photo Booth Party',eventType:'Party',date:new Date('2026-10-10T12:00:00Z'),maxPrints:216,printingEnabled:true,qrSharingEnabled:true,venueAddress:'SECRET ADDRESS',customer:{name:'SECRET CUSTOMER',email:'secret@example.com',phone:'5555555'},theme:{boothExperience:{featured:'one',pauseSeconds:9,format:'strip',strips:2,photoFit:'fill',design:'blush',primary:'#855665',accent:'#e4b4a1'}}};
test('handoff contains only guest-visible event configuration, never contact or venue data',()=>{
 const cfg=makeEventHandoff(sample),link=makeHandoffLink(sample);
 assert.deepEqual([cfg.v,cfg.f,cfg.b,cfg.l,cfg.s,cfg.n,cfg.g],[1,1,9,'strip',2,216,'blush']);
 assert.match(link,/\/load-event#/);
 const decoded=JSON.parse(Buffer.from(link.split('#')[1],'base64url').toString('utf8'));
 assert.deepEqual(decoded,cfg);
 for(const secret of ['secret@example.com','SECRET ADDRESS','SECRET CUSTOMER','5555555'])assert(!JSON.stringify(decoded).includes(secret));
 assert(encodeHandoff(cfg).length<1400);
});
test('handoff explicitly handles digital-only events and validates IDs',()=>{
 const x=makeEventHandoff({...sample,maxPrints:0,printingEnabled:false});
 assert.equal(x.p,false);assert.equal(x.n,0);
 assert.throws(()=>makeEventHandoff({...sample,id:'invalid/../id'}));
});
