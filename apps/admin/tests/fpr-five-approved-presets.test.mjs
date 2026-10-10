import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FPR_PRINT_PRESETS,isFprPrintPreset,presetForEventType} from '../../booth/app/lib/fpr-print-presets.mjs';
import {approvedDesignFor,mergeExperience,experienceFrom} from '../lib/studio-experience.mjs';
import {ownerPreviewConfig,renderOwnerDesign} from '../lib/owner-design-preview.mjs';
import {buildBoothHandoffPayload} from '../lib/booth-transfer.mjs';
import {validateBoothHandoff,configFromBoothHandoff} from '../../booth/app/lib/booth-handoff.mjs';
import {guestEventConfig} from '../../booth/app/lib/guest-design.mjs';
import {renderKeepsake} from '../../booth/app/lib/keepsake-designs.mjs';

test('the event design editor has exactly five approved illustrated presets plus custom',async()=>{
 assert.deepEqual(FPR_PRINT_PRESETS.map(d=>d.name),['Graduation','Wedding','Birthday','Quinceañera','Corporate Event']);
 assert.equal(new Set(FPR_PRINT_PRESETS.map(d=>d.id)).size,5);
 for(const preset of FPR_PRINT_PRESETS){
  assert(isFprPrintPreset(preset.id));
  assert.equal(approvedDesignFor('Any event',preset.id),preset.id);
  assert.match(preset.image,/^\/print-presets\/[-\w]+\.webp$/);
 }
 assert.equal(presetForEventType('Quinceañera'),'fpr-quince');
 assert.equal(presetForEventType('Wedding'),'fpr-wedding');
 assert.equal(presetForEventType('Graduation'),'fpr-graduation');
 const editor=await readFile(new URL('../app/ExperienceEditor.js',import.meta.url),'utf8');
 assert.match(editor,/FPR_PRINT_PRESETS\.map\(/);
 assert.match(editor,/owner-design-custom/);
 assert.doesNotMatch(editor,/owner-design-standard/);
});

test('admin choice persists into protected iPad handoff and renders the exact same 1/4-photo proofs',()=>{
 for(const preset of FPR_PRINT_PRESETS){
  const eventType='Other celebration';
  const form=new Map(Object.entries({eventType,approvedDesign:preset.id,nameOnPrint:'Rivera Party',classYear:'2027'}));
  const theme=mergeExperience({ownerUnrelated:'retained'},form);
  assert.equal(theme.ownerUnrelated,'retained');
  const event={id:'preset_approved_'+preset.key,name:'Rivera Party',eventType,
   date:new Date('2027-06-10T12:00:00.000Z'),
   startTime:new Date('2027-06-10T18:00:00.000Z'),endTime:new Date('2027-06-10T22:00:00.000Z'),
   updatedAt:new Date('2026-10-09T12:00:00.000Z'),theme,maxPrints:108,printingEnabled:true,qrSharingEnabled:true};
  const payload=buildBoothHandoffPayload(event);
  assert.equal(payload.design,preset.id);
  assert.equal(validateBoothHandoff(payload).design,preset.id);
  const owner=ownerPreviewConfig({eventType,eventName:event.name,eventDate:'2027-06-10',experience:experienceFrom(event)});
  const booth=guestEventConfig(configFromBoothHandoff(payload));
  assert.equal(booth.defaultTemplate,preset.id);
  for(const [shots,layout] of [[1,'card'],[4,'photo_strip']]){
   const adminProof=renderOwnerDesign(owner,shots,'proof');
   const guestProof=renderKeepsake({cfg:booth,photo:'',poses:[],sample:true,template:'ivory',monogram:'RP',
     layout,stripMode:'single',filter:'none',id:'proof'});
   assert.equal(adminProof,guestProof,preset.id+' '+shots);
   assert.match(adminProof,/data-fpr-preset=/);
   assert.equal((adminProof.match(/data-approved-photo-region=/g)||[]).length,shots);
  }
 }
});

test('sample portraits are hidden behind captured-photo openings, never treated as customer photos',()=>{
 const svg=renderKeepsake({cfg:{guestMode:'approved',defaultTemplate:'fpr-wedding',title:'Rivera Wedding',
  date:'June 10, 2027'},layout:'photo_strip',sample:true,poses:[],id:'proof'});
 assert.equal((svg.match(/data-guest-photo="true"/g)||[]).length,0);
 assert.equal((svg.match(/data-approved-photo-region=/g)||[]).length,4);
 assert.throws(()=>renderKeepsake({cfg:{guestMode:'approved',defaultTemplate:'fpr-wedding'},layout:'photo_strip',
  poses:['bogus','bogus','bogus','bogus'],id:'test'}),/captured photo/i);
});
