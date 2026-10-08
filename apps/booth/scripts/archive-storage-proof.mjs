import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const source=await readFile(new URL('../app/lib/event-photo-archive.mjs',import.meta.url),'utf8');
const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Photo storage test</title>');});
await new Promise(r=>server.listen(3199,'127.0.0.1',r));
const results=[];let failed=false;
try{for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:3199');
 const result=await page.evaluate(async source=>{
  const events=[];window.addEventListener('unhandledrejection',e=>events.push({type:'rejection',name:e.reason?.name,message:e.reason?.message}));
  // Capture the request's real error before its transaction has aborted.
  const originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=(...args)=>{const req=originalOpen(...args);req.addEventListener('success',()=>{req.result.addEventListener('error',e=>events.push({type:'idb-error',name:e.target?.error?.name,message:e.target?.error?.message,source:e.target?.source?.name}));});return req;};
  const api=new Function(source.replace(/\bexport /g,'')+'\nreturn {saveCapture,saveKeepsake,listCaptures,archiveCount,exportPhotos,deleteArchivedEvent,openArchive,crc32};')();
  const stages=[];async function step(name,job){try{const result=await job();stages.push({name,ok:true});return result;}catch(e){stages.push({name,ok:false,error:e.message,type:e.name});throw e;}}
  async function expectBlocked(name,job){let error;try{await job();}catch(e){error=e;}if(!error)throw Error(name+' unexpectedly deleted photos.');stages.push({name,ok:true,blocked:true});}
  async function changeStoredImage(field){
   const db=await api.openArchive();
   try{await new Promise((resolve,reject)=>{const tx=db.transaction('captures','readwrite'),store=tx.objectStore('captures');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);const request=store.get('retention:id-0');request.onsuccess=()=>{const record=request.result;const old=field==='poses'?record.poses[0]:record[field];const bytes=new Uint8Array(old).slice();bytes[bytes.length-3]^=1;if(field==='poses')record.poses=[bytes.buffer,...record.poses.slice(1)];else record[field]=bytes.buffer;store.put(record);};});}
   finally{db.close();}
  }
  try{
   const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillStyle='#334455';ctx.fillRect(0,0,32,32);const photo=canvas.toDataURL('image/jpeg');
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
   return {ok:true,count,stages,events};
  }catch(e){return {ok:false,stages,events};}
 },source);
 results.push({engine:name,...result});if(!result.ok)failed=true;
 }finally{await browser.close();}
}}finally{await new Promise(r=>server.close(r));}
await mkdir('welcome-proof',{recursive:true});await writeFile('welcome-proof/archive-storage-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));if(failed)process.exitCode=1;
