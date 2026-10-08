import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {approvedDesignFor,experienceFrom,mergeExperience,statusText} from '../lib/studio-experience.mjs';
import {buildBoothHandoffPayload} from '../lib/booth-transfer.mjs';
import {zipJpegs,crc32,safeGalleryName} from '../lib/event-gallery-zip.mjs';

test('only graduation can use navy and gold, all events choose one approved look',()=>{
 assert.equal(approvedDesignFor('Graduation','grad-gala'),'grad-gala');
 assert.equal(approvedDesignFor('Wedding','grad-gala'),'champagne');
 assert.equal(approvedDesignFor('Birthday','ivory'),'ivory');
 assert.equal(approvedDesignFor('Other','bad-value'),'champagne');
});
test('staff-approved name/year and design persist alongside unrelated event JSON',()=>{
 const base={proof:'keep this',boothExperience:{otherField:'preserved'}};
 const form=new Map(Object.entries({eventType:'Graduation',approvedDesign:'grad-gala',nameOnPrint:'Taylor',classYear:'2027',featured:'four',pauseSeconds:'6',format:'strip',strips:'1',photoFit:'fill',paletteId:'champagne',primaryColor:'#09244c',accentColor:'#ff962c'}));
 const updated=mergeExperience(base,form);
 assert.equal(updated.proof,'keep this');
 assert.equal(updated.boothExperience.otherField,'preserved');
 const experience=experienceFrom({eventType:'Graduation',theme:updated});
 assert.equal(experience.approvedDesign,'grad-gala');
 assert.equal(experience.nameOnPrint,'Taylor');
 assert.equal(experience.classYear,'2027');
 const event={id:'event-2027-taylor',name:'Taylor Graduation',eventType:'Graduation',date:new Date('2027-06-10T12:00:00Z'),startTime:new Date('2027-06-10T17:00:00Z'),endTime:new Date('2027-06-10T21:00:00Z'),updatedAt:new Date('2026-10-08T16:00:00Z'),theme:updated,maxPrints:108,printingEnabled:true,qrSharingEnabled:true};
 const handoff=buildBoothHandoffPayload(event);
 assert.equal(handoff.design,'grad-gala');assert.equal(handoff.name,'Taylor');assert.equal(handoff.year,'2027');
 assert.equal(handoff.guest,'approved');
 assert(!JSON.stringify(handoff).includes('private@example.test'));
});
test('ZIP of private JPEGs includes standard signatures, files and accurate sizes',async()=>{
 const image=new Uint8Array([0xff,0xd8,0xff,0xd9]),manifest=new TextEncoder().encode('{"sessions":1}');
 const zip=zipJpegs([{name:'manifest.json',data:manifest},{name:'session-001.jpg',data:image}]);
 const bytes=new Uint8Array(await zip.arrayBuffer()),view=new DataView(bytes.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 const firstNameLength=view.getUint16(26,true);
 assert.equal(new TextDecoder().decode(bytes.slice(30,30+firstNameLength)),'manifest.json');
 assert.equal(view.getUint32(14,true),crc32(manifest));
 assert.equal(view.getUint32(18,true),manifest.byteLength);
 assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);
 assert.equal(view.getUint16(bytes.length-12,true),2);
 assert(zip.size>manifest.length+image.length);
 assert.equal(safeGalleryName('Graduation / Taylor!'),'Graduation-Taylor');
 assert.throws(()=>zipJpegs([{name:'../../unsafe.jpg',data:image}]));
});
test('event management separates archive from destructive deletion',async()=>{
 const source=await readFile(new URL('../app/events/actions.js',import.meta.url),'utf8');
 assert.match(source,/export async function completeEvent/);
 assert.match(source,/export async function archiveEvent/);
 assert.match(source,/event\.status!=='ARCHIVED'/);
 assert.match(source,/value\(form,'confirmation'\)!==event\.name/);
 assert.match(source,/value\(form,'galleryChecked'\)!=='yes'/);
 assert.match(source,/DELETE FROM booth_backup_v1\.images WHERE event_id=/);
 assert.equal(statusText('COMPLETED'),'Completed');assert.equal(statusText('ARCHIVED'),'Archived');
});
