import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness,experienceFrom,mergeExperience,nonnegativePrints,dateTimeFields,wallTime,toLocalDay,COLORS,guestHandoffMessage} from '../lib/studio-experience.mjs';
const full={customer:{name:'Customer'},venueName:'Venue',venueAddress:'100 Main St',boothId:'b1',templateId:'t1'};
const draft={...full,venueName:null,venueAddress:null};
test('readiness never calls a configured event ready if the address is missing',()=>{
 assert.equal(readiness({...draft,status:'CONFIGURED'}).complete,3);
 assert.equal(readiness({...draft,status:'CONFIGURED'}).ready,false);
 assert.equal(readiness({...draft,status:'CONFIGURED'}).next.id,'venue');
 assert.equal(readiness(full).ready,true);
 assert.equal(readiness({...full,venueAddress:null}).ready,false);
});
test('guest photo defaults match the new booth, both sessions remain available',()=>{
 const e=experienceFrom({});
 assert.deepEqual([e.featured,e.pauseSeconds,e.format,e.strips,e.photoFit],['four',6,'card',1,'fill']);
});
test('event settings merge safely into theme and keep unrelated design metadata',()=>{
 const theme={logo:'retain-this',boothExperience:{legacyFlag:'retain-this-too'}};
 const form=new Map(Object.entries({featured:'one',pauseSeconds:'9',format:'strip',strips:'2',photoFit:'fit',paletteId:'rose',primaryColor:'#123456',accentColor:'#abcdef'}));
 const next=mergeExperience(theme,form);
 assert.equal(next.logo,'retain-this');
 assert.equal(next.boothExperience.legacyFlag,'retain-this-too');
 assert.deepEqual(Object.entries(experienceFrom({theme:next})).filter(([k])=>['featured','pauseSeconds','format','strips','photoFit'].includes(k)).map(([,v])=>v),['one',9,'strip',2,'fit']);
 assert.equal(next.boothExperience.primary,'#123456');
 assert.equal(next.boothExperience.accent,'#abcdef');
 assert.equal(theme.boothExperience.featured,undefined,'original config must not mutate');
});
test('invalid color, print and pause inputs receive safe defaults',()=>{
 const e=experienceFrom({theme:{boothExperience:{pauseSeconds:999,strips:5,photoFit:'bad',primary:'<script>',accent:'url(evil)'}}});
 assert.deepEqual([e.pauseSeconds,e.strips,e.photoFit,e.primary,e.accent],[6,1,'fill',COLORS[0].primary,COLORS[0].accent]);
 assert.equal(nonnegativePrints('0'),0);
 assert.equal(nonnegativePrints('216'),216);
 assert.throws(()=>nonnegativePrints('-1'));
 assert.throws(()=>nonnegativePrints('abc'));
});
test('events running past midnight keep the following-day end without moving the starting date',()=>{
 const date='2026-10-10',times=dateTimeFields(date,'20:00','00:00');
 assert.equal(toLocalDay(times.date),date);
 assert.equal(wallTime(times.startTime),'20:00');
 assert.equal(wallTime(times.endTime),'00:00');
 assert.equal(toLocalDay(times.endTime),'2026-10-11');
 assert.throws(()=>dateTimeFields(date,'20:00','20:00'));
});
test('admin never tells staff that these updates automatically sync to a live iPad',()=>{
 assert.match(guestHandoffMessage(),/saved in the admin database/);
 assert.match(guestHandoffMessage(),/does not silently change/);
});
