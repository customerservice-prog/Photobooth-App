import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const source=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Photo storage test</title>');});
await new Promise(r=>server.listen(3199,'127.0.0.1',r));
const results=[];let failed=false;
const engines=[['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.ARCHIVE_PROOF_BROWSERS||process.env.ARCHIVE_PROOF_BROWSERS.split(',').includes(name));
if(!engines.length)throw new Error('Choose chromium or webkit for the archive proof.');
try{for(const [name,engine] of engines){
 const browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:3199');
 const result=await page.evaluate(async source=>{
  const events=[];window.addEventListener('unhandledrejection',e=>events.push({type:'rejection',name:e.reason?.name,message:e.reason?.message}));
  // Capture the request's real error before its transaction has aborted.
  const originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{const req=originalOpen(...args);req.addEventListener('success',()=>{req.result.addEventListener('error',e=>events.push({type:'idb-error',name:e.target?.error?.name,message:e.target?.error?.message,source:e.target?.source?.name}));});return req;};
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {savePose,saveCapture,saveKeepsake,importLegacyCaptures,listCaptures,recentCaptures,archiveCount,exportPhotos,deleteArchivedEvent,openArchive,crc32};')();
  const stages=[];async function step(name,job){try{const result=await job();stages.push({name,ok:true});return result;}catch(e){stages.push({name,ok:false,error:e.message,type:e.name});throw e;}}
  async function expectBlocked(name,job){let error;try{await job();}catch(e){error=e;}if(!error)throw Error(name+' unexpectedly deleted photos.');stages.push({name,ok:true,blocked:true});}
  async function zipFiles(blob){
   const bytes=new Uint8Array(await blob.arrayBuffer()),view=new DataView(bytes.buffer),files=[];let offset=0;
   while(view.getUint32(offset,true)===0x04034b50){
    const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
    const name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength,data=bytes.slice(start,start+size);
    if(api.crc32(data)!==view.getUint32(offset+14,true))throw Error('ZIP CRC failed for '+name);
    files.push({name,data});offset=start+size;
   }
   return files;
  }
  async function changeStoredImage(field){
   const db=await api.openArchive();
   try{await new Promise((resolve,reject)=>{const tx=db.transaction('captures','readwrite'),store=tx.objectStore('captures');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);const request=store.get('retention:id-0');request.onsuccess=()=>{const record=request.result;const old=field==='poses'?record.poses[0]:record[field];const bytes=new Uint8Array(old).slice();bytes[bytes.length-3]^=1;if(field==='poses')record.poses=[bytes.buffer,...record.poses.slice(1)];else record[field]=bytes.buffer;store.put(record);};});}
   finally{db.close();}
  }
  try{
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#334455';ctx.fillRect(0,0,32,32);const photo=canvas.toDataURL('image/jpeg');
   ctx.fillStyle='#778899';ctx.fillRect(0,0,32,32);const secondPhoto=canvas.toDataURL('image/jpeg');
   const notifications=[],committed=[];
   const observeSaved=event=>{
    if(event.detail.scope!=='interrupted')return;
    notifications.push(event.detail.kind);
    committed.push(api.listCaptures('interrupted').then(records=>{
     const record=records.find(record=>record.id===event.detail.id);
     if(!record||event.detail.kind==='collage'&&!record.collage||event.detail.kind==='keepsake'&&!record.keepsake||/^pose-/.test(event.detail.kind)&&!record.poses[Number(event.detail.kind.slice(5))-1])throw Error('Upload notification was sent before its image committed.');
    }));
   };
   window.addEventListener('friendly-booth-photo-saved',observeSaved);
   await step('save-first-original-before-session-finishes',()=>api.savePose('interrupted','same-session',1,photo,{title:'Interrupted synthetic session'}));
   const partial=(await api.listCaptures('interrupted'))[0];
   if(partial.collage!==null||partial.poses.length!==1||await api.archiveCount('interrupted')!==1||(await api.recentCaptures('interrupted')).length!==0)throw Error('An interrupted session invented a finished image or lost its first pose.');
   const partialZip=await step('export-interrupted-original-without-fake-collage',()=>api.exportPhotos('interrupted'));
   await step('verify-interrupted-original-export-bytes',async()=>{
    const files=await zipFiles(partialZip.blob),manifest=JSON.parse(new TextDecoder().decode(files.find(file=>file.name==='manifest.json').data)),original=files.find(file=>file.name==='session-0001/pose-1.jpg');
    const expected=Uint8Array.from(atob(photo.split(',')[1]),character=>character.charCodeAt(0));
    if(files.length!==2||!original||original.data.length!==expected.length||original.data.some((byte,index)=>byte!==expected[index])||manifest.originalPhotos!==1||manifest.interruptedSessions!==1||manifest.finishedKeepsakes!==0)throw Error('Interrupted original export changed or omitted captured photo bytes.');
   });
   await expectBlocked('reject-pose-gap-without-changing-archive',()=>api.savePose('interrupted','same-session',3,photo,{}));
   await expectBlocked('reject-conflicting-original-without-overwrite',()=>api.savePose('interrupted','same-session',1,secondPhoto,{}));
   await step('append-second-original-to-the-same-session',()=>api.savePose('interrupted','same-session',2,secondPhoto,{}));
   await expectBlocked('new-original-invalidates-export-snapshot',()=>api.deleteArchivedEvent('interrupted',1,partialZip.snapshot));
   await step('same-capture-id-is-isolated-by-event',()=>api.savePose('interrupted-isolated','same-session',1,secondPhoto,{}));
   await step('finalize-existing-originals-without-duplicating-session',()=>api.saveCapture('interrupted','same-session',photo,[photo,secondPhoto,photo,secondPhoto],{}));
   const finalized=(await api.listCaptures('interrupted'))[0];
   if(await api.archiveCount('interrupted')!==1||!finalized.collage||finalized.poses.length!==4||finalized.createdAt!==partial.createdAt||finalized.revision===partial.revision||(await api.recentCaptures('interrupted')).length!==1||await api.archiveCount('interrupted-isolated')!==1)throw Error('Finalizing an interrupted session lost originals, duplicated the session, or crossed event scopes.');
   await step('save-designed-image-on-the-same-session',()=>api.saveKeepsake('interrupted','same-session',finalized.collage));
   await step('retry-finalization-preserves-the-designed-image',()=>api.saveCapture('interrupted','same-session',photo,[photo,secondPhoto,photo,secondPhoto],{}));
   await expectBlocked('conflicting-finalization-preserves-originals',()=>api.saveCapture('interrupted','same-session',photo,[secondPhoto,secondPhoto,photo,secondPhoto],{}));
   if(!(await api.listCaptures('interrupted'))[0].keepsake)throw Error('Retrying finalization removed the finished design.');
   await Promise.all(committed);window.removeEventListener('friendly-booth-photo-saved',observeSaved);
   if(notifications.join(',')!=='pose-1,pose-2,collage,keepsake,collage')throw Error('Failed saves triggered uploads or committed originals did not trigger uploads.');
   for(let i=0;i<23;i++)await step('save-capture-'+i,()=>api.saveCapture('retention','id-'+i,photo,[photo,photo,photo,photo],{title:'Synthetic test'}));
   await step('save-second-scope',()=>api.saveCapture('separate','other',photo,[photo,photo,photo,photo],{}));
   const records=await step('list-all-records',()=>api.listCaptures('retention'));
   await step('read-first-pose-bytes',()=>records[0].poses[0].arrayBuffer());
   await step('save-final-keepsake',()=>api.saveKeepsake('retention','id-0',records[0].collage));
   const count=await step('count-scope',()=>api.archiveCount('retention'));
   const exported=await step('zip-all-records',()=>api.exportPhotos('retention'));
   if(exported.count!==23)throw Error('The exported ZIP must contain all 23 sessions.');
   await step('verify-zip-file-bytes-and-manifest',async()=>{
    const bytes=new Uint8Array(await exported.blob.arrayBuffer()),view=new DataView(bytes.buffer),files=[];let offset=0;
    while(view.getUint32(offset,true)===0x04034b50){
     const size=view.getUint32(offset+18,true),nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
     const name=new TextDecoder().decode(bytes.slice(offset+30,offset+30+nameLength)),start=offset+30+nameLength+extraLength,data=bytes.slice(start,start+size);
     if(api.crc32(data)!==view.getUint32(offset+14,true))throw Error('ZIP CRC failed for '+name);
     files.push({name,data});offset=start+size;
    }
    const manifest=JSON.parse(new TextDecoder().decode(files.find(f=>f.name==='manifest.json').data));
    if(manifest.sessions!==23||manifest.finishedKeepsakes!==1||files.filter(f=>/pose-\d\.jpg$/.test(f.name)).length!==92||files.filter(f=>f.name.endsWith('keepsake.jpg')).length!==1||files.length!==116)throw Error('ZIP did not retain every pose and designed output.');
   });
   // Count equality alone does not prove an export is current: an existing
   // session can receive a finished JPEG or modified same-sized image bytes.
   await expectBlocked('missing-snapshot-deletion-blocked',()=>api.deleteArchivedEvent('retention',23));
   await expectBlocked('wrong-count-deletion-blocked',()=>api.deleteArchivedEvent('retention',22,exported.snapshot));
   await step('save-keepsake-after-export',()=>api.saveKeepsake('retention','id-1',records[1].collage));
   await expectBlocked('same-count-new-keepsake-deletion-blocked',()=>api.deleteArchivedEvent('retention',23,exported.snapshot));
   let latest=await api.exportPhotos('retention');
   for(const field of ['poses','collage','keepsake']){
    await step('change-same-sized-'+field,()=>changeStoredImage(field));
    await expectBlocked('changed-'+field+'-deletion-blocked',()=>api.deleteArchivedEvent('retention',23,latest.snapshot));
    if(await api.archiveCount('retention')!==23)throw Error('Stale export deleted the customer photo archive.');
    latest=await api.exportPhotos('retention');
   }
   await step('explicit-event-only-deletion',()=>api.deleteArchivedEvent('retention',23,latest.snapshot));
   if(await api.archiveCount('retention')!==0||await api.archiveCount('separate')!==1)
    throw Error('Closing an event must remove only that one exported event.');
   const empty=await step('export-empty-event-record',()=>api.exportPhotos('retention',{allowEmpty:true}));
   if(empty.count!==0)throw Error('Empty event ZIP unexpectedly includes photographs.');
   await step('close-empty-event',()=>api.deleteArchivedEvent('retention',0,empty.snapshot));
   const legacy=[{id:'legacy-one',createdAt:'2026-10-08T12:00:00Z',data:photo},{id:'legacy-two',createdAt:'2026-10-08T12:01:00Z',data:photo},{id:'legacy-one',data:photo}];
   const originalLegacy=JSON.stringify(legacy);localStorage.setItem('proof-retained-legacy-gallery',originalLegacy);
   const imported=await step('import-legacy-gallery-without-source-removal',()=>api.importLegacyCaptures('legacy-migration',JSON.parse(localStorage.getItem('proof-retained-legacy-gallery')),{title:'Legacy synthetic event'}));
   if(imported.imported!==2||imported.total!==2||localStorage.getItem('proof-retained-legacy-gallery')!==originalLegacy)throw Error('Legacy import did not preserve every source photo.');
   const migrated=await api.listCaptures('legacy-migration');
   if(migrated.length!==2||migrated.some(record=>record.poses.length!==0||record.originalPosesUnknown!==true))throw Error('Legacy import must not invent original poses.');
   await step('finish-migrated-legacy-keepsake',()=>api.saveKeepsake('legacy-migration','legacy-one',migrated[0].collage));
   const repeated=await step('repeat-legacy-import-without-duplicates-or-overwrites',()=>api.importLegacyCaptures('legacy-migration',legacy,{}));
   if(repeated.imported!==0||repeated.existing!==2||!(await api.listCaptures('legacy-migration')).find(record=>record.id==='legacy-one').keepsake)throw Error('Repeated legacy import duplicated or overwrote saved photos.');
   ctx.fillStyle='#778899';ctx.fillRect(0,0,32,32);const differentPhoto=canvas.toDataURL('image/jpeg');
   await expectBlocked('conflicting-legacy-id-aborts-entire-import',()=>api.importLegacyCaptures('legacy-migration',[{id:'new-before-conflict',data:photo},{id:'legacy-one',data:differentPhoto}],{}));
   if(await api.archiveCount('legacy-migration')!==2||localStorage.getItem('proof-retained-legacy-gallery')!==originalLegacy)throw Error('A failed import changed the saved gallery.');
   await step('new-legacy-capture-uses-binary-archive',()=>api.saveCapture('legacy-migration','fresh-after-migration',photo,[photo],{}));
   const legacyZip=await step('export-original-and-new-legacy-captures',()=>api.exportPhotos('legacy-migration'));
   if(legacyZip.count!==3||legacyZip.finishedKeepsakes!==1)throw Error('Legacy gallery ZIP did not include retained and new captures.');
   return {ok:true,count,stages,events};
  }catch(e){return {ok:false,stages,events};}
 },source);
 results.push({engine:name,...result});if(!result.ok)failed=true;
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
await mkdir('welcome-proof',{recursive:true});await writeFile('welcome-proof/archive-storage-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(failed)process.exitCode=1;
