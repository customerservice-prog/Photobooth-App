import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEventConfig,finalizeEventSetup} from '../app/lib/event-config.mjs';
import {octoberPreset,validatePreparation} from '../app/lib/event-workspace.mjs';

test('legacy settings default to the safe photo experience and pose pause',()=>{
 const config=normalizeEventConfig({type:'other',title:'Annual Party',details:{eventName:'Annual Party'}});
 assert.equal(config.defaultPhotoExperience,'four');
 assert.equal(config.photoPauseSeconds,6);
});
test('simple setup saves single-photo preference without changing print allowance',()=>{
 const cfg=finalizeEventSetup({
  type:'other',title:'Annual Party',date:'October 10, 2026',
  details:{eventName:'Annual Party'},photoPauseSeconds:9,defaultPhotoExperience:'one',
  printPackage:{includedPrints:108,addOnPrints:54},printLayouts:{cardEnabled:true,stripEnabled:true}
 });
 assert.equal(cfg.defaultPhotoExperience,'one');
 assert.equal(cfg.photoPauseSeconds,9);
 assert.equal(cfg.printPackage.includedPrints,108);
 assert.equal(cfg.printPackage.addOnPrints,54);
});
test('managed event preparation keeps pause and featured quick portrait',()=>{
 const config=validatePreparation({...octoberPreset(),defaultPhotoExperience:'one',photoPauseSeconds:12,printPackage:{includedPrints:108,addOnPrints:54,shotsPerSession:4}});
 assert.equal(config.defaultPhotoExperience,'one');
 assert.equal(config.photoPauseSeconds,12);
 assert.equal(config.printPackage.includedPrints,108);
 assert.equal(config.printPackage.addOnPrints,54);
 assert.equal(config.printPackage.copiesPerSession,1);
});
