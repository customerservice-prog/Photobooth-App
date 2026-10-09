import test from 'node:test';
import assert from 'node:assert/strict';
import {ownerEventFamily,ownerApprovedDesigns,ownerPreviewConfig,renderOwnerDesign} from '../lib/owner-design-preview.mjs';
import {EVENT_TYPES,experienceFrom} from '../lib/studio-experience.mjs';
import {buildBoothHandoffPayload} from '../lib/booth-transfer.mjs';
import {configFromBoothHandoff} from '../../booth/app/lib/booth-handoff.mjs';
import {guestEventConfig} from '../../booth/app/lib/guest-design.mjs';
import {eventMonogram} from '../../booth/app/lib/event-config.mjs';
import {renderKeepsake} from '../../booth/app/lib/keepsake-designs.mjs';

test('every owner artwork proof matches both guest layouts after real handoff',()=>{
 let designs=0;
 for(const eventType of EVENT_TYPES){
  for(const design of ownerApprovedDesigns(eventType)){
   const event=Object.freeze({id:'owner-proof-test',name:'Taylor & Jordan celebration',eventType,
    date:'2027-06-10T12:00:00.000Z',startTime:'2027-06-10T18:00:00.000Z',endTime:'2027-06-10T22:00:00.000Z',
    updatedAt:'2026-10-09T12:00:00.000Z',theme:Object.freeze({boothExperience:Object.freeze({
     approvedDesign:design.id,nameOnPrint:'Taylor & Jordan',classYear:'2027',
     featured:'one',pauseSeconds:12,photoFit:'fit',format:'strip',strips:2,
     paletteId:'rose',primary:'#123456',accent:'#cdefab'
    })})});
   const experience=Object.freeze(experienceFrom(event));
   const owner=ownerPreviewConfig({eventType,eventName:event.name,eventDate:'2027-06-10',experience});
   const guest=guestEventConfig(configFromBoothHandoff(buildBoothHandoffPayload(event)));
   for(const shots of [1,4]){
    const actual=renderOwnerDesign(owner,shots,'owner-proof');
    const expected=renderKeepsake({cfg:guest,photo:'',poses:[],sample:true,template:guest.defaultTemplate,
     monogram:eventMonogram(guest),layout:shots===1?'card':'photo_strip',stripMode:'single',filter:'none',id:'owner-proof'});
    assert.equal(actual,expected,`${eventType}/${design.id}: ${shots}-photo proof must match booth artwork`);
   }
   assert.equal(owner.approvedPrintName,'Taylor & Jordan');
   assert.equal(owner.date,'June 10, 2027');
   assert.equal(owner.photoFit,'fit');
   assert.equal(owner.details.primaryColor,'#123456');
   assert.equal(owner.details.secondaryColor,'#cdefab');
   assert.equal(experience.strips,2);
   designs++;
  }
 }
 assert.equal(designs,25); // Party, Quinceañera and Other celebration use the Other family.
});
test('owner preview resolves occasion names and retains stored design IDs',()=>{
 assert.equal(ownerEventFamily('Bar / Bat Mitzvah'),'mitzvah');
 assert.equal(ownerEventFamily('wedding'),'wedding');
 assert.equal(ownerEventFamily('Party'),'other');
 assert.equal(ownerEventFamily('Quinceañera'),'other');
 assert.equal(ownerApprovedDesigns('Quinceañera').length,3);
 assert.equal(ownerApprovedDesigns('Graduation').at(-1).id,'grad-gala');
 assert.equal(ownerApprovedDesigns('Wedding')[0].name,'Rosewater Romance');
 const cfg=ownerPreviewConfig({eventType:'Wedding',eventName:'Our wedding',eventDate:'2027-06-10',experience:{approvedDesign:'grad-gala'}});
 assert.equal(cfg.defaultTemplate,'ivory');
 assert.equal(cfg.approvedPrintName,'Our wedding');
});
test('live blank print name falls back to event title and invalid dates show no invented date',()=>{
 const experience=Object.freeze({approvedDesign:'ivory',nameOnPrint:'',classYear:'2027',primary:'#123456',accent:'#cdefab'});
 const input=Object.freeze({eventType:'Graduation',eventName:'Updated title',eventDate:'2027-02-31',experience});
 const cfg=ownerPreviewConfig(input);
 assert.equal(cfg.approvedPrintName,'Updated title');
 assert.equal(cfg.details.graduate,'Updated title');
 assert.equal(cfg.details.classYear,'2027');
 assert.equal(cfg.date,'Date not set');
 assert.equal(experience.nameOnPrint,'');
 assert.equal(ownerPreviewConfig({...input,eventDate:''}).date,'Date not set');
 const gala=ownerPreviewConfig({...input,eventDate:'',experience:{...experience,approvedDesign:'grad-gala'}});
 assert.match(renderOwnerDesign(gala,4),/DATE NOT SET/);
 assert(!renderOwnerDesign(gala,4).includes('OCTOBER 10TH 2026'));
});
test('untrusted print text is cleaned for both exact-renderer proofs',()=>{
 const cfg=ownerPreviewConfig({eventType:'Corporate',eventName:'Owner event',eventDate:'2027-06-10',experience:{nameOnPrint:'<script>alert(1)</script>',approvedDesign:'ivory'}});
 for(const shots of [1,4])assert(!renderOwnerDesign(cfg,shots).includes('<script>'));
});
